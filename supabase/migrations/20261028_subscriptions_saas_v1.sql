-- AutoEasier SaaS v1: prenumeratos (Stripe), prieigos tikrinimas serveryje.
-- Rašo tik stripe-webhook (service role). Vartotojas gali tik skaityti savo įrašą.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'none'
    check (status in ('none','trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid','paused')),
  plan text not null default 'pro',
  price_id text,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  past_due_since timestamptz,
  trial_used boolean not null default false,
  comped boolean not null default false,
  trial_reminder_sent_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
drop policy if exists subscriptions_self_read on public.subscriptions;
create policy subscriptions_self_read on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- Prieigos taisyklė (vienintelė vieta serveryje):
-- comped arba trialing/active, arba past_due ne ilgiau kaip 3 dienas.
create or replace function public.subscription_access_for(p_user uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce((
    select s.comped
        or s.status in ('trialing','active')
        or (s.status = 'past_due' and coalesce(s.past_due_since, s.updated_at) > pg_catalog.now() - interval '3 days')
    from public.subscriptions s where s.user_id = p_user), false)
$$;
revoke all on function public.subscription_access_for(uuid) from public, anon, authenticated;

create or replace function public.account_has_access()
returns boolean language sql stable security definer set search_path to '' as $$
  select auth.uid() is not null and public.subscription_access_for(auth.uid())
$$;
revoke all on function public.account_has_access() from public, anon;
grant execute on function public.account_has_access() to authenticated;

create or replace function public.account_subscription()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare r public.subscriptions;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  select * into r from public.subscriptions s where s.user_id = auth.uid();
  return pg_catalog.jsonb_build_object(
    'status', coalesce(r.status, 'none'),
    'plan', coalesce(r.plan, 'pro'),
    'trial_end', r.trial_end,
    'current_period_end', r.current_period_end,
    'cancel_at_period_end', coalesce(r.cancel_at_period_end, false),
    'past_due_since', r.past_due_since,
    'grace_until', case when r.status = 'past_due' then coalesce(r.past_due_since, r.updated_at) + interval '3 days' end,
    'trial_used', coalesce(r.trial_used, false),
    'comped', coalesce(r.comped, false),
    'has_customer', r.stripe_customer_id is not null,
    'access', public.subscription_access_for(auth.uid()),
    'now', pg_catalog.now()
  );
end $$;
revoke all on function public.account_subscription() from public, anon;
grant execute on function public.account_subscription() to authenticated;

-- Esamos paskyros (sukurtos prieš prenumeratas) – nemokama prieiga, kad niekas neprarastų darbo.
insert into public.subscriptions(user_id, status, comped, trial_used)
select u.id, 'active', true, true from auth.users u
on conflict (user_id) do nothing;

-- Rašymas serveryje tik su galiojančia prieiga
create or replace function public.account_save_state(p_expected_revision bigint, p_payload jsonb)
 RETURNS TABLE(revision bigint, updated_at timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_revision bigint;
  v_updated_at timestamptz;
  v_current_payload jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not public.subscription_access_for(v_user_id) then
    raise exception using errcode = '42501', message = 'Subscription required';
  end if;
  if p_expected_revision is null or p_expected_revision < 0
     or p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object'
     or pg_catalog.octet_length(p_payload::text) > 12000000 then
    raise exception using errcode = '22023', message = 'Invalid or oversized app state';
  end if;

  select s.revision, s.updated_at, s.payload
    into v_revision, v_updated_at, v_current_payload
  from public.user_app_state s
  where s.user_id = v_user_id
  for update;

  if not found then
    if p_expected_revision <> 0 then
      raise exception using errcode = '40001', message = 'Account state changed; reload required';
    end if;
    begin
      insert into public.user_app_state(user_id, payload, revision, updated_at)
      values (v_user_id, p_payload, 1, pg_catalog.now())
      returning user_app_state.revision, user_app_state.updated_at
      into v_revision, v_updated_at;
    exception when unique_violation then
      select s.revision, s.updated_at, s.payload
        into v_revision, v_updated_at, v_current_payload
      from public.user_app_state s
      where s.user_id = v_user_id
      for update;
      if found and v_current_payload is not distinct from p_payload then
        return query select v_revision, v_updated_at;
        return;
      end if;
      raise exception using errcode = '40001', message = 'Account state changed; reload required';
    end;
  else
    if v_revision <> p_expected_revision then
      if v_current_payload is not distinct from p_payload then
        return query select v_revision, v_updated_at;
        return;
      end if;
      raise exception using errcode = '40001', message = 'Account state changed; reload required';
    end if;
    update public.user_app_state s set payload = p_payload,
      revision = s.revision + 1, updated_at = pg_catalog.now()
    where s.user_id = v_user_id
    returning s.revision, s.updated_at into v_revision, v_updated_at;
  end if;
  return query select v_revision, v_updated_at;
end
$function$;

create or replace function public.account_restore_backup(p_version_id bigint)
 RETURNS TABLE(revision bigint, updated_at timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare v_payload jsonb; v_revision bigint; v_updated_at timestamptz;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if not public.subscription_access_for(auth.uid()) then
    raise exception using errcode = '42501', message = 'Subscription required';
  end if;
  select v.payload into v_payload from public.user_app_state_versions v
  where v.id = p_version_id and v.user_id = auth.uid();
  if not found then raise exception using errcode = 'P0002', message = 'Backup not found'; end if;
  update public.user_app_state s set payload = v_payload,
    revision = s.revision + 1, updated_at = pg_catalog.now()
  where s.user_id = auth.uid() returning s.revision, s.updated_at into v_revision, v_updated_at;
  if not found then raise exception using errcode = 'P0002', message = 'Account state not found'; end if;
  return query select v_revision, v_updated_at;
end
$function$;

-- Nuotraukų ir dokumentų įkėlimas – tik su prieiga (skaitymas lieka visada)
drop policy if exists user_media_self_insert on storage.objects;
create policy user_media_self_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.account_has_access())
  );
