window.AUTOEASIER_AUTH_CONFIG = window.AUTOEASIER_AUTH_CONFIG || {
  supabaseUrl: "https://ztcvipmxrnxkcydxbdsw.supabase.co",
  supabasePublishableKey: "sb_publishable_XuAGF5sFrhrCYzjwjhmfLQ_nt6_uJbB",
  siteUrl: "",
  subscriptionUrl: ""
};
(() => {
  const cfg = window.AUTOEASIER_AUTH_CONFIG;
  const gate = document.getElementById("autoEasierLogin");
  const form = document.getElementById("autoEasierLoginForm");
  const emailInput = document.getElementById("autoEasierEmail");
  const emailField = document.getElementById("autoEasierEmailField");
  const passwordInput = document.getElementById("autoEasierPassword");
  const confirmInput = document.getElementById("autoEasierConfirmPassword");
  const confirmField = document.getElementById("autoEasierConfirmField");
  const message = document.getElementById("autoEasierAuthMessage");
  const submit = document.getElementById("autoEasierSubmit");
  const modeToggle = document.getElementById("autoEasierModeToggle");
  const resetLink = document.getElementById("autoEasierResetLink");
  const appNodes = [
    document.querySelector(".app"),
    document.querySelector(".navWrap"),
    document.getElementById("modalBackdrop"),
    document.getElementById("toastWrap"),
    document.getElementById("appLock")
  ].filter(Boolean);
  let client = null,
    clientPromise = null,
    authMode = "login";
  const setMessage = (text, ok = false) => {
    message.textContent = text;
    message.hidden = !text;
    message.classList.toggle("is-success", !!ok);
  };
  const showGate = () => {
    stopCloudSync();
    gate.hidden = false;
    appNodes.forEach(n => {
      n.setAttribute("inert", "");
      n.setAttribute("aria-hidden", "true");
    });
    document.body.classList.add("autoeasier-auth-locked");
  };
  const showApp = () => {
    gate.hidden = true;
    appNodes.forEach(n => {
      n.removeAttribute("inert");
      n.removeAttribute("aria-hidden");
    });
    document.body.classList.remove("autoeasier-auth-locked");
  };
  const validConfig = () =>
    /^https:\/\//i.test(cfg.supabaseUrl || "") &&
    String(cfg.supabasePublishableKey || "").startsWith("sb_publishable_");
  const setMode = mode => {
    authMode = mode;
    const creating = mode === "signup",
      resetting = mode === "reset";
    confirmField.hidden = !(creating || resetting);
    emailField.hidden = resetting;
    modeToggle.hidden = resetting;
    resetLink.hidden = creating || resetting;
    passwordInput.autocomplete = creating || resetting ? "new-password" : "current-password";
    passwordInput.placeholder = resetting ? "Naujas slaptažodis" : "Slaptažodis";
    passwordInput.setAttribute("aria-label", passwordInput.placeholder);
    confirmInput.placeholder = creating ? "Pakartokite slaptažodį" : "Pakartokite naują slaptažodį";
    submit.querySelector("span").textContent = creating
      ? "Sukurti paskyrą"
      : resetting
        ? "Atnaujinti slaptažodį"
        : "Prisijungti";
    modeToggle.textContent = creating ? "Jau turite paskyrą? Prisijungti" : "Sukurti paskyrą";
    setMessage("");
  };
  const loadClient = () => {
    if (client) return Promise.resolve(client);
    if (clientPromise) return clientPromise;
    if (!validConfig()) return Promise.reject(new Error("Supabase projektas dar nesukonfigūruotas."));
    clientPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-autoeasier-supabase-sdk]");
      const ready = () => {
        try {
          if (!window.supabase?.createClient) throw new Error("Nepavyko įkelti Supabase bibliotekos.");
          client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
              storageKey: "autoeasier-auth-v1"
            }
          });
          resolve(client);
        } catch (e) {
          reject(e);
        }
      };
      if (window.supabase?.createClient) {
        ready();
        return;
      }
      const s = existing || document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.async = true;
      s.dataset.autoeasierSupabaseSdk = "true";
      s.onload = ready;
      s.onerror = () => reject(new Error("Nepavyko pasiekti Supabase. Patikrinkite interneto ryšį."));
      if (!existing) document.head.appendChild(s);
    }).catch(error => {
      clientPromise = null;
      throw error;
    });
    return clientPromise;
  };
  let accountId = "",
    workspaceRevision = 0,
    cloudReady = false,
    applyingRemote = false,
    localDirty = false,
    cloudConflict = false,
    cloudTimer = 0,
    pollTimer = 0,
    bootstrapPromise = null,
    bootstrapUser = "",
    syncPromise = null,
    localSaveListener = null,
    pollCloudListener = null,
    visibilityListener = null,
    pageHideListener = null,
    lastSyncedPayload = null;
  const uploadedMedia = new Set(),
    downloadedMedia = new Map();
  const SYNC_MARKER = "autoeasier-account-sync-v2";
  const meaningful = s => {
    const f = s?.finances || {},
      a = s?.accounting || {},
      stats = s?.stats || {};
    return !!(
      (s?.cars || []).length ||
      (s?.garageTasks || []).length ||
      (s?.importantTasks || []).length ||
      (s?.leadVariants || []).length ||
      (s?.customers || []).length ||
      (s?.history || []).length ||
      (s?.historyLog || []).length ||
      (s?.completionLog || []).length ||
      (s?.contactBook?.contacts || []).length ||
      (s?.contactBook?.groups || []).length ||
      (s?.finances?.transactions || []).length ||
      (f.debts || []).length ||
      (f.debtLedger || []).length ||
      (a.queue || []).length ||
      (a.history || []).length ||
      Object.keys(s?.completedToday || {}).length ||
      Object.keys(s?.unlockedAchievements || {}).length ||
      (s?.worldsUnlocked || []).length ||
      (s?.shopPurchases || []).length ||
      Object.values(stats).some(v => Number(v) !== 0) ||
      ["monthlyNetProfit", "monthlyRevenue", "monthlyExpenses", "lifetimeNetProfit", "budgetBalance"].some(
        k => Number(f[k]) !== 0
      ) ||
      Number(s?.xp) !== 0 ||
      Number(s?.coins) !== 0 ||
      Number(s?.streak) !== 0 ||
      Number(s?.maxStreak) !== 0 ||
      Number(s?.level || 1) !== 1 ||
      !!s?.dailyQuestClaimed
    );
  };
  const sharedState = s => {
    const x = JSON.parse(JSON.stringify(s || {}));
    delete x.security;
    delete x.selectedView;
    delete x.ui;
    delete x.theme;
    delete x.sound;
    delete x.vibrate;
    return x;
  };
  const stableString = value => {
    if (Array.isArray(value)) return `[${value.map(stableString).join(",")}]`;
    if (value && typeof value === "object")
      return `{${Object.keys(value)
        .sort()
        .map(k => JSON.stringify(k) + ":" + stableString(value[k]))
        .join(",")}}`;
    return JSON.stringify(value);
  };
  const hashState = async value => {
    const raw = stableString(value);
    try {
      if (window.crypto?.subtle) {
        const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
        return [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {}
    let h = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      h ^= raw.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `${raw.length}-${(h >>> 0).toString(16)}`;
  };
  const MISSING = Symbol("missing"),
    sameValue = (a, b) =>
      a === MISSING ? b === MISSING : b !== MISSING && stableString(a) === stableString(b),
    cloneValue = v => (v === MISSING ? MISSING : JSON.parse(JSON.stringify(v))),
    isRecord = v => v !== MISSING && v !== null && typeof v === "object" && !Array.isArray(v);
  const mergeThreeWay = (base, local, remote, path = "state") => {
    if (sameValue(local, base)) return cloneValue(remote);
    if (sameValue(remote, base) || sameValue(local, remote)) return cloneValue(local);
    if (isRecord(local) || isRecord(remote) || isRecord(base)) {
      const b = isRecord(base) ? base : {},
        l = isRecord(local) ? local : {},
        r = isRecord(remote) ? remote : {},
        keys = new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)]),
        out = {};
      for (const key of keys) {
        const value = mergeThreeWay(
          Object.prototype.hasOwnProperty.call(b, key) ? b[key] : MISSING,
          Object.prototype.hasOwnProperty.call(l, key) ? l[key] : MISSING,
          Object.prototype.hasOwnProperty.call(r, key) ? r[key] : MISSING,
          `${path}.${key}`
        );
        if (value !== MISSING) out[key] = value;
      }
      return out;
    }
    if (Array.isArray(local) || Array.isArray(remote) || Array.isArray(base)) {
      const b = Array.isArray(base) ? base : [],
        l = Array.isArray(local) ? local : [],
        r = Array.isArray(remote) ? remote : [],
        idArray = a => a.every(x => isRecord(x) && "id" in x);
      if (!idArray(b) || !idArray(l) || !idArray(r))
        throw new Error(`Vienu metu pakeistas nesujungiamas sąrašas: ${path}`);
      const maps = [b, l, r].map(a => new Map(a.map(x => [String(x.id), x]))),
        ids = [
          ...new Set([...r.map(x => String(x.id)), ...l.map(x => String(x.id)), ...b.map(x => String(x.id))])
        ],
        out = [];
      for (const id of ids) {
        const value = mergeThreeWay(
          maps[0].has(id) ? maps[0].get(id) : MISSING,
          maps[1].has(id) ? maps[1].get(id) : MISSING,
          maps[2].has(id) ? maps[2].get(id) : MISSING,
          `${path}[${id}]`
        );
        if (value !== MISSING) out.push(value);
      }
      return out;
    }
    throw new Error(`Vienu metu pakeistas tas pats laukas: ${path}`);
  };
  const readMarker = userId => {
    try {
      return JSON.parse(localStorage.getItem(SYNC_MARKER + ":" + userId) || "null");
    } catch (e) {
      return null;
    }
  };
  const writeMarker = async (userId, hash) => {
    try {
      localStorage.setItem(
        SYNC_MARKER + ":" + userId,
        JSON.stringify({ userId, accountId, revision: workspaceRevision, hash, at: new Date().toISOString() })
      );
    } catch (e) {}
  };
  const mediaKeys = payload => {
    const out = new Set(),
      seen = new WeakSet();
    const walk = v => {
      if (typeof v === "string") {
        if (/^(?:photo|doc)_[A-Za-z0-9_-]{4,}$/.test(v)) out.add(v);
        return;
      }
      if (!v || typeof v !== "object" || seen.has(v)) return;
      seen.add(v);
      if (Array.isArray(v)) {
        v.forEach(walk);
        return;
      }
      Object.values(v).forEach(walk);
    };
    walk(payload);
    return [...out];
  };
  const mediaType = key => (key.startsWith("doc_") ? "application/pdf" : "image/jpeg");
  const setSyncStatus = (label, kind = "") => {
    const el = document.getElementById("autoEasierAccountStatus");
    if (!el) return;
    el.replaceChildren();
    el.dataset.state = kind;
    el.style.cssText =
      "display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 2px 0;color:#64748b;font-size:13px;font-weight:700";
    const text = document.createElement("span");
    text.textContent = label;
    el.append(text);
    if (cloudConflict) {
      const backup = document.createElement("button");
      backup.type = "button";
      backup.textContent = "Atsisiųsti vietinę kopiją";
      backup.style.cssText =
        "min-height:36px;padding:0 11px;border:1px solid #d8e2ed;border-radius:10px;background:#fff;color:#17324d;font:inherit;font-weight:800";
      const refresh = document.createElement("button");
      refresh.type = "button";
      refresh.textContent = "Atidaryti naujausius paskyros duomenis";
      refresh.disabled = true;
      refresh.style.cssText =
        "min-height:36px;padding:0 11px;border:0;border-radius:10px;background:#1769c2;color:#fff;font:inherit;font-weight:800;opacity:.55";
      backup.onclick = async () => {
        backup.disabled = true;
        try {
          await downloadLocalBackup();
          backup.textContent = "Kopija atsisiųsta";
          refresh.disabled = false;
          refresh.style.opacity = "1";
        } catch (e) {
          backup.disabled = false;
          backup.textContent = "Kopijos atsisiuntimas nepavyko";
        }
      };
      refresh.onclick = async () => {
        if (refresh.disabled) return;
        refresh.disabled = true;
        try {
          const c = await loadClient(),
            row = await fetchWorkspaceState(c);
          if (!row) throw new Error("Bendra versija nerasta.");
          cloudConflict = false;
          await applySharedPayload(row.payload, row.revision, activeSessionUserId);
          setSyncStatus("Sinchronizuota", "ok");
        } catch (e) {
          cloudConflict = true;
          refresh.disabled = false;
          refresh.style.opacity = "1";
          setSyncStatus("Nepavyko atnaujinti paskyros duomenų", "error");
        }
      };
      el.append(backup, refresh);
    } else if (kind === "error" && cloudReady) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "Bandyti dar kartą";
      retry.style.cssText =
        "min-height:36px;padding:0 11px;border:1px solid #d8e2ed;border-radius:10px;background:#fff;color:#17324d;font:inherit;font-weight:800";
      retry.onclick = () => window.AUTOEASIER_WORKSPACE?.flush?.();
      el.append(retry);
    }
  };
  const downloadLocalBackup = async () => {
    const blob = await window.AUTOEASIER_APP_DATA.makeBackup(),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `AutoEasier-vietine-kopija-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 6e4);
  };
  const offerLocalBackup = () => {
    if (!meaningful(window.AUTOEASIER_APP_DATA.getState())) return;
    let button = document.getElementById("autoEasierGateBackup");
    if (!button) {
      button = document.createElement("button");
      button.id = "autoEasierGateBackup";
      button.type = "button";
      button.textContent = "Atsisiųsti šio įrenginio duomenų kopiją";
      button.style.cssText =
        "display:block;width:100%;min-height:44px;margin-top:10px;padding:8px 12px;border:1px solid #d8e2ed;border-radius:12px;background:#fff;color:#17324d;font:700 14px/1.3 Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif";
      (message.parentElement || form).appendChild(button);
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await downloadLocalBackup();
          button.textContent = "Vietinė kopija atsisiųsta";
        } catch (e) {
          button.textContent = "Kopijos atsisiųsti nepavyko";
          setMessage(e?.message || "Vietinės kopijos sukurti nepavyko.");
        } finally {
          button.disabled = false;
        }
      });
    }
  };
  const applySharedPayload = async (payload, revision, userId) => {
    const next = { ...payload, ...{} };
    workspaceRevision = Number(revision) || 0;
    applyingRemote = true;
    try {
      window.AUTOEASIER_APP_DATA.replaceState(next);
    } finally {
      applyingRemote = false;
    }
    lastSyncedPayload = sharedState(window.AUTOEASIER_APP_DATA.getState());
    mediaKeys(lastSyncedPayload).forEach(key => uploadedMedia.add(key));
    const hash = await hashState(lastSyncedPayload);
    localDirty = false;
    cloudConflict = false;
    await writeMarker(userId, hash);
    setSyncStatus("Sinchronizuota", "ok");
  };
  let activeSessionUserId = "";
  const downloadMedia = async key => {
    if (!accountId || !key) return null;
    if (downloadedMedia.has(key)) return downloadedMedia.get(key);
    const c = await loadClient();
    const task = c.storage
      .from("user-media")
      .download(`${accountId}/${key}`)
      .then(({ data, error }) => {
        if (error) throw error;
        return data || null;
      })
      .catch(() => null);
    downloadedMedia.set(key, task);
    return task;
  };
  window.AUTOEASIER_WORKSPACE = { downloadMedia };
  const uploadReferencedMedia = async (c, payload) => {
    for (const key of mediaKeys(payload)) {
      if (uploadedMedia.has(key)) continue;
      const path = `${accountId}/${key}`,
        blob = await window.AUTOEASIER_APP_DATA.readMedia(key);
      if (!blob)
        throw new Error(
          `Nepavyko rasti vietinio failo (${key}). Atsisiųskite atsarginę kopiją šiame įrenginyje ir patikrinkite failą prieš tęsdami.`
        );
      const { error } = await c.storage.from("user-media").upload(path, blob, {
        upsert: false,
        contentType: blob.type || mediaType(key),
        cacheControl: "3600"
      });
      if (error) {
        if (/duplicate|already exists/i.test(`${error.message || ""} ${error.error || ""}`)) {
          const existing = await c.storage.from("user-media").download(path);
          if (!existing.error && existing.data) {
            uploadedMedia.add(key);
            continue;
          }
        }
        throw error;
      }
      uploadedMedia.add(key);
    }
  };
  const fetchWorkspaceState = async c => {
    const { data, error } = await c
      .from("user_app_state")
      .select("payload,revision,updated_at")
      .eq("user_id", accountId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  };
  const seedWorkspace = async (c, payload) => {
    await uploadReferencedMedia(c, payload);
    const { data, error } = await c.rpc("account_save_state", { p_expected_revision: 0, p_payload: payload });
    if (error) throw error;
    workspaceRevision = Number(data?.[0]?.revision) || 1;
    lastSyncedPayload = JSON.parse(JSON.stringify(payload));
    const hash = await hashState(payload);
    await writeMarker(activeSessionUserId, hash);
    localDirty = false;
    setSyncStatus("Paskyros duomenys paruošti", "ok");
  };
  const beginCloudSync = async userId => {
    const c = await loadClient();
    clearTimeout(cloudTimer);
    clearInterval(pollTimer);
    if (localSaveListener) window.removeEventListener("autoeasier:local-save", localSaveListener);
    if (pollCloudListener) window.removeEventListener("focus", pollCloudListener);
    if (visibilityListener) document.removeEventListener("visibilitychange", visibilityListener);
    if (pageHideListener) window.removeEventListener("pagehide", pageHideListener);
    cloudReady = true;
    localDirty = false;
    cloudConflict = false;
    const current = sharedState(window.AUTOEASIER_APP_DATA.getState());
    let initialSyncHash = await hashState(current);
    lastSyncedPayload = JSON.parse(JSON.stringify(current));
    localSaveListener = () => {
      if (!cloudReady || applyingRemote) return;
      localDirty = true;
      setSyncStatus("Laukiama sinchronizavimo…", "pending");
      clearTimeout(cloudTimer);
      cloudTimer = setTimeout(() => flushCloudSync(), 1100);
    };
    window.addEventListener("autoeasier:local-save", localSaveListener);
    const flushCloudSync = async () => {
      if (!cloudReady || !localDirty || cloudConflict) return;
      if (syncPromise) return syncPromise;
      syncPromise = (async () => {
        let payload = sharedState(window.AUTOEASIER_APP_DATA.getState());
        try {
          setSyncStatus("Sinchronizuojama…", "pending");
          await uploadReferencedMedia(c, payload);
          let result = await c.rpc("account_save_state", {
            p_expected_revision: workspaceRevision,
            p_payload: payload
          });
          if (
            result.error &&
            (result.error.code === "40001" || /reload required|changed/i.test(result.error.message || ""))
          ) {
            const remote = await fetchWorkspaceState(c);
            if (!remote) throw result.error;
            const localNow = sharedState(window.AUTOEASIER_APP_DATA.getState());
            if ((await hashState(localNow)) !== (await hashState(payload)))
              throw new Error(
                "Kol vyko sinchronizavimas, atsirado naujų pakeitimų. Pakartokite sinchronizavimą."
              );
            const remotePayload = sharedState(remote.payload);
            let merged;
            try {
              merged = mergeThreeWay(lastSyncedPayload || {}, payload, remotePayload);
            } catch (mergeError) {
              cloudConflict = true;
              setSyncStatus("Pakeitimai laukia sujungimo – vietiniai duomenys išsaugoti", "error");
              throw mergeError;
            }
            mediaKeys(remotePayload).forEach(key => uploadedMedia.add(key));
            applyingRemote = true;
            try {
              window.AUTOEASIER_APP_DATA.replaceState(merged);
            } finally {
              applyingRemote = false;
            }
            payload = sharedState(window.AUTOEASIER_APP_DATA.getState());
            workspaceRevision = Number(remote.revision) || workspaceRevision;
            if ((await hashState(payload)) === (await hashState(remotePayload))) {
              payload = remotePayload;
              result = { data: [{ revision: workspaceRevision }], error: null };
            } else {
              await uploadReferencedMedia(c, payload);
              result = await c.rpc("account_save_state", {
                p_expected_revision: workspaceRevision,
                p_payload: payload
              });
              if (result.error) throw result.error;
            }
          }
          if (result.error) throw result.error;
          const resultRow = Array.isArray(result.data) ? result.data[0] : result.data;
          const returnedRevision = Number(resultRow?.revision);
          workspaceRevision =
            Number.isFinite(returnedRevision) && returnedRevision > 0
              ? returnedRevision
              : workspaceRevision + 1;
          lastSyncedPayload = JSON.parse(JSON.stringify(payload));
          initialSyncHash = await hashState(payload);
          localDirty = false;
          cloudConflict = false;
          await writeMarker(userId, initialSyncHash);
          setSyncStatus("Sinchronizuota", "ok");
          const currentHash = await hashState(sharedState(window.AUTOEASIER_APP_DATA.getState()));
          if (currentHash !== initialSyncHash) {
            localDirty = true;
            clearTimeout(cloudTimer);
            cloudTimer = setTimeout(() => flushCloudSync(), 500);
          }
        } catch (error) {
          console.error("AutoEasier cloud sync failed", error);
          if (
            error.code === "40001" ||
            /Vienu metu pakeistas|nesujungiamas sąrašas|Kol vyko sinchronizavimas/i.test(error.message || "")
          )
            cloudConflict = true;
          setSyncStatus(
            cloudConflict
              ? "Pakeitimai laukia sujungimo – vietiniai duomenys išsaugoti"
              : "Neįkelta – vietiniai duomenys išsaugoti",
            "error"
          );
          if (!cloudConflict)
            setMessage(
              "Sinchronizuoti nepavyko. Duomenys liko šiame įrenginyje; patikrinkite ryšį ir bandykite dar kartą."
            );
        } finally {
          syncPromise = null;
        }
      })();
      return syncPromise;
    };
    const pollCloud = async () => {
      if (!cloudReady || !accountId) return;
      try {
        const row = await fetchWorkspaceState(c);
        if (!row || Number(row.revision) === workspaceRevision) return;
        const local = sharedState(window.AUTOEASIER_APP_DATA.getState()),
          hash = await hashState(local);
        if (localDirty || hash !== initialSyncHash) {
          localDirty = true;
          setSyncStatus("Keli pakeitimai sinchronizuojami…", "pending");
          clearTimeout(cloudTimer);
          cloudTimer = setTimeout(() => flushCloudSync(), 100);
          return;
        }
        await applySharedPayload(row.payload, row.revision, userId);
        initialSyncHash = await hashState(sharedState(window.AUTOEASIER_APP_DATA.getState()));
      } catch (error) {
        console.warn("Workspace refresh failed", error);
      }
    };
    pollCloudListener = pollCloud;
    visibilityListener = () => {
      if (document.visibilityState === "visible") pollCloud();
      else flushCloudSync();
    };
    pageHideListener = () => flushCloudSync();
    window.addEventListener("focus", pollCloudListener);
    document.addEventListener("visibilitychange", visibilityListener);
    window.addEventListener("pagehide", pageHideListener);
    clearInterval(pollTimer);
    pollTimer = setInterval(pollCloud, 3e4);
    window.AUTOEASIER_WORKSPACE.flush = flushCloudSync;
    window.AUTOEASIER_WORKSPACE.resetBaseline = async () => {
      lastSyncedPayload = sharedState(window.AUTOEASIER_APP_DATA.getState());
      initialSyncHash = await hashState(lastSyncedPayload);
      localDirty = false;
    };
    window.AUTOEASIER_WORKSPACE.listBackups = async () => {
      const { data, error } = await c.rpc("account_list_backups");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    };
    window.AUTOEASIER_WORKSPACE.restoreBackup = async id => {
      await downloadLocalBackup();
      const { error } = await c.rpc("account_restore_backup", { p_version_id: Number(id) });
      if (error) throw error;
      const row = await fetchWorkspaceState(c);
      if (!row) throw new Error("Atkurta versija nerasta.");
      await applySharedPayload(row.payload, row.revision, userId);
      await window.AUTOEASIER_WORKSPACE.resetBaseline();
      setSyncStatus("Atsarginė versija atkurta", "ok");
    };
    return { pollCloud };
  };
  const attachWorkspacePanel = async session => {
    const menu = document.querySelector("#view-menu .menuIntro");
    if (!menu) return;
    let row = document.getElementById("autoEasierAccountSession");
    if (!row) {
      row = document.createElement("div");
      row.id = "autoEasierAccountSession";
      row.className = "autoEasierSessionControl";
      row.innerHTML =
        '<span class="autoEasierSessionEmail"></span><button type="button" data-session-signout>Atsijungti</button>';
      menu.appendChild(row);
      row.querySelector("[data-session-signout]").addEventListener("click", async () => {
        try {
          const c = await loadClient();
          await c.auth.signOut();
        } catch (e) {
          window.AUTOEASIER_APP_DATA.lockAccount();
          showGate();
        }
      });
    }
    row.querySelector(".autoEasierSessionEmail").textContent = session.user.email || "";
    let status = document.getElementById("autoEasierAccountStatus");
    if (!status) {
      status = document.createElement("div");
      status.id = "autoEasierAccountStatus";
      status.style.cssText = "margin:8px 2px 0;color:#64748b;font-size:13px;font-weight:700";
      row.insertAdjacentElement("afterend", status);
    }
    setSyncStatus(cloudReady ? "Sinchronizuota" : "Prisijungta", "ok");
  };
  function stopCloudSync() {
    cloudReady = false;
    clearTimeout(cloudTimer);
    clearInterval(pollTimer);
    if (localSaveListener) window.removeEventListener("autoeasier:local-save", localSaveListener);
    if (pollCloudListener) window.removeEventListener("focus", pollCloudListener);
    if (visibilityListener) document.removeEventListener("visibilitychange", visibilityListener);
    if (pageHideListener) window.removeEventListener("pagehide", pageHideListener);
    localSaveListener = pollCloudListener = visibilityListener = pageHideListener = null;
    downloadedMedia.clear();
    uploadedMedia.clear();
    document.getElementById("autoEasierMembersPanel")?.remove();
    document.getElementById("autoEasierAccountSession")?.remove();
    document.getElementById("autoEasierAccountStatus")?.remove();
    window.AUTOEASIER_WORKSPACE = { downloadMedia: async () => null };
  }
  const bootstrapWorkspace = async session => {
    activeSessionUserId = session.user.id;
    window.__autoEasierUserEmail = session.user.email || "";
    accountId = session.user.id;
    workspaceRevision = 0;
    downloadedMedia.clear();
    uploadedMedia.clear();
    stopCloudSync();
    window.AUTOEASIER_APP_DATA.switchAccount(session.user.id, {
      importLegacy: String(session.user.email || "").toLowerCase() === "autoeasier@gmail.com"
    });
    const c = await loadClient();
    window.AUTOEASIER_WORKSPACE = { downloadMedia };
    let row = await fetchWorkspaceState(c);
    const local = sharedState(window.AUTOEASIER_APP_DATA.getState());
    if (!row) {
      await seedWorkspace(c, local);
      row = await fetchWorkspaceState(c);
      if (!row)
        throw new Error("Nepavyko saugiai išsaugoti paskyros duomenų. Vietinė kopija liko šiame įrenginyje.");
    } else await applySharedPayload(row.payload, row.revision, session.user.id);
    workspaceRevision = Number(row.revision) || workspaceRevision;
    await beginCloudSync(session.user.id);
    await attachWorkspacePanel(session);
    showApp();
    setMessage("");
    return true;
  };
  const safeShowApp = async session => {
    if (!session?.user) {
      accountId = "";
      window.AUTOEASIER_APP_DATA.lockAccount();
      showGate();
      return false;
    }
    if (bootstrapPromise && bootstrapUser === session.user.id) return bootstrapPromise;
    bootstrapUser = session.user.id;
    bootstrapPromise = (async () => {
      try {
        return await bootstrapWorkspace(session);
      } catch (error) {
        showGate();
        const text = /user_app_state|account_save_state|user-media|schema cache|relation/i.test(
          String(error?.message || "")
        )
          ? "Paskyros duomenų saugykla dar neparuošta. Vietiniai duomenys šiame įrenginyje išsaugoti."
          : error?.message || "Nepavyko paruošti paskyros. Vietiniai duomenys šiame įrenginyje išsaugoti.";
        setMessage(text);
        offerLocalBackup();
        return false;
      } finally {
        bootstrapPromise = null;
        bootstrapUser = "";
      }
    })();
    return bootstrapPromise;
  };
  const authRedirectUrl = () =>
    cfg.siteUrl ||
    (location.protocol === "http:" || location.protocol === "https:"
      ? location.origin + location.pathname
      : "");
  const demo = location.protocol === "file:" && new URLSearchParams(location.search).get("demo") === "1";
  if (demo) {
    showApp();
    setMessage("");
  } else {
    showGate();
    if (validConfig())
      loadClient()
        .then(async c => {
          const { data, error } = await c.auth.getSession();
          if (error) throw error;
          if (data.session) await safeShowApp(data.session);
          c.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY") {
              showGate();
              setMode("reset");
              return;
            }
            if (authMode === "reset") return;
            if (session?.user) {
              if (cloudReady && activeSessionUserId === session.user.id) return;
              if (["SIGNED_IN", "INITIAL_SESSION", "USER_UPDATED"].includes(event))
                setTimeout(() => safeShowApp(session), 0);
            } else {
              accountId = "";
              window.AUTOEASIER_APP_DATA.lockAccount();
              showGate();
            }
          });
        })
        .catch(error => {
          showGate();
          setMessage(
            error?.message ||
              "Nepavyko prisijungti prie „Supabase“. Patikrinkite interneto ryšį ir projekto nustatymus."
          );
        });
  }
  document.getElementById("autoEasierPasswordToggle").addEventListener("click", () => {
    const reveal = passwordInput.type === "password";
    passwordInput.type = reveal ? "text" : "password";
    const btn = document.getElementById("autoEasierPasswordToggle");
    btn.setAttribute("aria-pressed", String(reveal));
    btn.setAttribute("aria-label", reveal ? "Slėpti slaptažodį" : "Rodyti slaptažodį");
  });
  modeToggle.addEventListener("click", () => setMode(authMode === "signup" ? "login" : "signup"));
  resetLink.addEventListener("click", async () => {
    const email = String(emailInput.value || "")
      .trim()
      .toLowerCase();
    if (!emailInput.checkValidity()) {
      emailInput.reportValidity();
      return;
    }
    if (!validConfig()) {
      setMessage("Slaptažodžio atkūrimui reikia Supabase viešo rakto.");
      return;
    }
    resetLink.disabled = true;
    try {
      const c = await loadClient(),
        redirect = authRedirectUrl(),
        options = redirect ? { redirectTo: redirect } : undefined;
      const { error } = await c.auth.resetPasswordForEmail(email, options);
      if (error) throw error;
      setMessage("Jei paskyra registruota, slaptažodžio atkūrimo nuoroda išsiųsta į el. paštą.", true);
    } catch (error) {
      setMessage(error?.message || "Nuorodos išsiųsti nepavyko.");
    } finally {
      resetLink.disabled = false;
    }
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    setMessage("");
    const email = String(emailInput.value || "")
        .trim()
        .toLowerCase(),
      password = String(passwordInput.value || "");
    if (authMode !== "reset" && !emailInput.checkValidity()) {
      emailInput.reportValidity();
      return;
    }
    if ((authMode === "signup" || authMode === "reset") && password.length < 8) {
      setMessage("Slaptažodį turi sudaryti bent 8 simboliai.");
      return;
    }
    if ((authMode === "signup" || authMode === "reset") && password !== confirmInput.value) {
      setMessage("Slaptažodžiai nesutampa.");
      return;
    }
    if (!validConfig()) {
      setMessage("Prisijungimui reikia „Supabase“ projekto URL ir viešo publishable rakto.");
      return;
    }
    submit.disabled = true;
    submit.querySelector("span").textContent =
      authMode === "signup" ? "Kuriama…" : authMode === "reset" ? "Atnaujinama…" : "Jungiamasi…";
    try {
      const c = await loadClient();
      let result;
      if (authMode === "signup") {
        const redirect = authRedirectUrl();
        result = await c.auth.signUp({
          email,
          password,
          options: redirect ? { emailRedirectTo: redirect } : undefined
        });
      } else if (authMode === "reset") result = await c.auth.updateUser({ password });
      else if (password) result = await c.auth.signInWithPassword({ email, password });
      else {
        setMessage("Įveskite slaptažodį, kad prisijungtumėte.");
        return;
      }
      if (result.error) throw result.error;
      if (result.data?.session?.user) {
        await safeShowApp(result.data.session);
        return;
      }
      if (authMode === "signup")
        setMessage(
          "Paskyra sukurta, bet „Supabase“ vis dar reikalauja el. pašto patvirtinimo. Išjunkite „Confirm email“ projekto Auth nustatymuose.",
          false
        );
      else if (authMode === "reset") {
        setMode("login");
        setMessage("Slaptažodis atnaujintas. Prisijunkite nauju slaptažodžiu.", true);
      } else setMessage("Prisijungti nepavyko. Patikrinkite el. paštą ir slaptažodį.");
    } catch (error) {
      const raw = String(error?.message || "");
      setMessage(
        /already registered|user exists/i.test(raw)
          ? "Šis el. paštas jau turi paskyrą. Prisijunkite arba atkurkite slaptažodį."
          : /signup is disabled|signups not allowed/i.test(raw)
            ? "Paskyrų kūrimas išjungtas „Supabase“ projekte. Įjunkite „Allow new users to sign up“ Auth nustatymuose."
            : raw || "Prisijungti nepavyko. Patikrinkite duomenis ir bandykite dar kartą."
      );
    } finally {
      submit.disabled = false;
      submit.querySelector("span").textContent =
        authMode === "signup"
          ? "Sukurti paskyrą"
          : authMode === "reset"
            ? "Atnaujinti slaptažodį"
            : "Prisijungti";
    }
  });
  const subscription = document.getElementById("autoEasierSubscription");
  if (cfg.subscriptionUrl) {
    subscription.href = cfg.subscriptionUrl;
    subscription.target = "_blank";
    subscription.rel = "noopener noreferrer";
  } else
    subscription.addEventListener("click", event => {
      event.preventDefault();
      setMessage("Prenumeratos nuoroda dar nesukonfigūruota.");
    });
})();
