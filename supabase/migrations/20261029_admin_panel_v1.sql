-- AutoEasier admin skydelis (v72): tik platformos administratorius (autoeasier@gmail.com).
-- Skaitymas – per šias RPC; veiksmai (keitimas, trynimas, Stripe) – Edge Function "admin-action" (service role).
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path to '' as $$
  select auth.uid() = '7d06aa84-0c36-4664-b371-3ebcac973cf3'::uuid
     and pg_catalog.lower(coalesce(auth.jwt() ->> 'email', '')) = 'autoeasier@gmail.com'
$$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  target_user uuid,
  target_email text,
  detail jsonb not null default '{}'::jsonb
);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare r jsonb;
begin
  if not public.is_platform_admin() then raise exception using errcode='42501', message='forbidden'; end if;
  select pg_catalog.jsonb_build_object(
    'users', (select count(*) from auth.users),
    'new_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'new_30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'active_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'trialing', (select count(*) from public.subscriptions where status='trialing' and not comped),
    'paying', (select count(*) from public.subscriptions where status='active' and not comped),
    'comped', (select count(*) from public.subscriptions where comped),
    'past_due', (select count(*) from public.subscriptions where status='past_due' and not comped),
    'canceled', (select count(*) from public.subscriptions where status in ('canceled','unpaid','incomplete_expired') and not comped),
    'no_sub', (select count(*) from auth.users u where not exists (select 1 from public.subscriptions s where s.user_id=u.id and (s.comped or s.status<>'none'))),
    'trials_ending', (select count(*) from public.subscriptions where status='trialing' and not comped and trial_end < now() + interval '3 days'),
    'mrr_eur', (select count(*) * 49 from public.subscriptions where status in ('active','past_due') and not comped and not cancel_at_period_end),
    'cars', (select coalesce(sum(jsonb_array_length(coalesce(payload->'cars','[]'::jsonb))),0) from public.user_app_state),
    'media_bytes', (select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects where bucket_id='user-media'),
    'media_files', (select count(*) from storage.objects where bucket_id='user-media'),
    'now', now()
  ) into r;
  return r;
end $$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_users()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare r jsonb;
begin
  if not public.is_platform_admin() then raise exception using errcode='42501', message='forbidden'; end if;
  select coalesce(pg_catalog.jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc), '[]'::jsonb) into r from (
    select u.id, u.email, u.created_at, u.last_sign_in_at,
      (u.banned_until is not null and u.banned_until > now()) as banned,
      (u.email_confirmed_at is not null) as confirmed,
      coalesce(s.status,'none') as status, coalesce(s.comped,false) as comped,
      s.trial_end, s.current_period_end, coalesce(s.cancel_at_period_end,false) as cancel_at_period_end,
      s.stripe_customer_id, s.stripe_subscription_id, coalesce(s.trial_used,false) as trial_used,
      public.subscription_access_for(u.id) as access,
      a.payload->'profile'->>'name' as profile_name, a.payload->'profile'->>'type' as profile_type,
      coalesce(jsonb_array_length(coalesce(a.payload->'cars','[]'::jsonb)),0) as cars,
      coalesce(jsonb_array_length(coalesce(a.payload->'leadVariants','[]'::jsonb)),0) as leads,
      a.updated_at as state_updated_at, a.revision,
      (select count(*) from storage.objects o where o.bucket_id='user-media' and (storage.foldername(o.name))[1]=u.id::text) as media_files,
      (select coalesce(sum((o.metadata->>'size')::bigint),0) from storage.objects o where o.bucket_id='user-media' and (storage.foldername(o.name))[1]=u.id::text) as media_bytes
    from auth.users u
    left join public.subscriptions s on s.user_id=u.id
    left join public.user_app_state a on a.user_id=u.id
  ) t;
  return r;
end $$;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

create or replace function public.admin_audit_list(p_limit int default 100)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.is_platform_admin() then raise exception using errcode='42501', message='forbidden'; end if;
  return (select coalesce(pg_catalog.jsonb_agg(row_to_json(x)::jsonb order by x.at desc), '[]'::jsonb)
    from (select at, action, target_email, detail from public.admin_audit order by at desc limit least(greatest(p_limit,1),500)) x);
end $$;
revoke all on function public.admin_audit_list(int) from public, anon;
grant execute on function public.admin_audit_list(int) to authenticated;

create or replace function public.admin_orphans()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.is_platform_admin() then raise exception using errcode='42501', message='forbidden'; end if;
  return (select pg_catalog.jsonb_build_object('files', count(*), 'bytes', coalesce(sum((o.metadata->>'size')::bigint),0))
    from storage.objects o where o.bucket_id='user-media'
      and not exists (select 1 from auth.users u where u.id::text = (storage.foldername(o.name))[1]));
end $$;
revoke all on function public.admin_orphans() from public, anon;
grant execute on function public.admin_orphans() to authenticated;
