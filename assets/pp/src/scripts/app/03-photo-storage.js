// Nuotraukų saugykla IndexedDB (photoPut/photoGet/compressPhoto) ir migracija iš data: URL.
// Dalis bendro app IIFE: visi src/scripts/app/*.js failai sujungiami eilės tvarka į vieną scope (žr. ARCHITECTURE.md).

const PHOTO_DB_NAME = "visureigiai_uab_photos_v1";
const PHOTO_DB_VERSION = 1;
const PHOTO_STORE_NAME = "photos";
const photoUrlCache = Object.create(null);
// v74: src naudojamas tik jei tai tikras adresas arba jau įkelta nuotrauka (kitaip – tuščia, užpildoma vėliau)
const photoSrcSafe = raw => {
  const s = String(raw || "");
  if (!s) return "";
  if (photoUrlCache[s]) return photoUrlCache[s];
  return /^(data:|blob:|https?:)/i.test(s) ? s : "";
};
const PHOTO_FALLBACK_PREFIX = "visureigiai_photo_fallback_";
let photoDbPromise = null;
function openPhotoDB() {
  if (photoDbPromise) return photoDbPromise;
  photoDbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB nepalaikomas"));
      return;
    }
    const req = indexedDB.open(PHOTO_DB_NAME, PHOTO_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        db.createObjectStore(PHOTO_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Nuotraukų saugyklos klaida"));
  });
  return photoDbPromise;
}
async function blobToDataUrl(blob) {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error || new Error("Nuotraukos skaitymo klaida"));
    r.readAsDataURL(blob);
  });
}
async function photoPut(blob) {
  const key = "photo_" + uid();
  try {
    const db = await openPhotoDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE_NAME, "readwrite");
      tx.objectStore(PHOTO_STORE_NAME).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Nuotraukos saugojimo klaida"));
      tx.onabort = () => reject(tx.error || new Error("Nuotraukos saugojimo klaida"));
    });
    return key;
  } catch (e) {
    try {
      const data = await blobToDataUrl(blob);
      localStorage.setItem(PHOTO_FALLBACK_PREFIX + key, data);
      return key;
    } catch (e2) {
      console.warn("Nuotraukos nepavyko išsaugoti nei IndexedDB, nei localStorage", e2);
      return "";
    }
  }
}
function photoDelete(key) {
  if (!key || !String(key).startsWith("photo_")) return Promise.resolve();
  const cached = photoUrlCache[key];
  if (cached) {
    try {
      URL.revokeObjectURL(cached);
    } catch (e) {}
    delete photoUrlCache[key];
  }
  try {
    localStorage.removeItem(PHOTO_FALLBACK_PREFIX + key);
  } catch (e) {}
  return openPhotoDB()
    .then(
      db =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(PHOTO_STORE_NAME, "readwrite");
          tx.objectStore(PHOTO_STORE_NAME).delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        })
    )
    .catch(() => {});
}
async function photoGet(key) {
  if (!key) return "";
  if (photoUrlCache[key]) return photoUrlCache[key];
  try {
    const fallback = localStorage.getItem(PHOTO_FALLBACK_PREFIX + key);
    if (fallback) {
      photoUrlCache[key] = fallback;
      return fallback;
    }
  } catch (e) {}
  try {
    const db = await openPhotoDB();
    const blob = await new Promise((resolve, reject) => {
      const req = db.transaction(PHOTO_STORE_NAME, "readonly").objectStore(PHOTO_STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("Nuotraukos nuskaitymo klaida"));
    });
    if (!blob) {
      const remote = await window.AUTOEASIER_WORKSPACE?.downloadMedia?.(key);
      if (!remote) return "";
      const data = await blobToDataUrl(remote);
      photoUrlCache[key] = data;
      return data;
    }
    const data = await blobToDataUrl(blob);
    photoUrlCache[key] = data;
    return data;
  } catch (e) {
    try {
      const remote = await window.AUTOEASIER_WORKSPACE?.downloadMedia?.(key);
      if (remote) {
        const data = await blobToDataUrl(remote);
        photoUrlCache[key] = data;
        return data;
      }
    } catch (remoteError) {}
    return "";
  }
}
async function compressPhoto(file) {
  if (!file || !/^image\//i.test(file.type)) return null;
  const maxSide = 900;
  if (window.createImageBitmap) {
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, maxSide / Math.max(bmp.width || maxSide, bmp.height || maxSide));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((bmp.width || maxSide) * scale));
      canvas.height = Math.max(1, Math.round((bmp.height || maxSide) * scale));
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      if (bmp.close) bmp.close();
      return await new Promise((resolve, reject) => {
        canvas.toBlob(
          async blob => {
            if (blob) {
              resolve(blob);
              return;
            }
            canvas.toBlob(b => (b ? resolve(b) : reject(new Error("compress"))), "image/jpeg", 0.45);
          },
          "image/webp",
          0.45
        );
      });
    } catch (e) {}
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxSide / Math.max(img.width || maxSide, img.height || maxSide));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round((img.width || maxSide) * scale));
          canvas.height = Math.max(1, Math.round((img.height || maxSide) * scale));
          const ctx = canvas.getContext("2d", { alpha: false });
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(b => (b ? resolve(b) : reject(new Error("compress"))), "image/jpeg", 0.45);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error("image"));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function storeImageFile(file) {
  const blob = await compressPhoto(file);
  return blob ? await photoPut(blob) : "";
}
async function dataUrlToPhotoKey(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return dataUrl || "";
  try {
    const blob = await fetch(dataUrl).then(r => r.blob());
    const file = new File([blob], "old-photo", { type: blob.type || "image/jpeg" });
    const compressed = await compressPhoto(file);
    return compressed ? await photoPut(compressed) : await photoPut(blob);
  } catch (e) {
    console.warn("Senos nuotraukos perkelti nepavyko", e);
    return "";
  }
}
async function migrateStatePhotos() {
  let changed = false;
  try {
    await openPhotoDB();
    const leads = Array.isArray(state.leadVariants) ? state.leadVariants : [];
    for (const lead of leads) {
      if (!Array.isArray(lead.photos)) lead.photos = [];
      const next = [];
      for (const ref of lead.photos) {
        if (typeof ref !== "string" || !ref) continue;
        if (ref.startsWith("data:image/")) {
          const key = await dataUrlToPhotoKey(ref);
          if (key) {
            next.push(key);
            changed = true;
          }
        } else {
          next.push(ref);
        }
      }
      lead.photos = next;
    }
    const cars = Array.isArray(state.cars) ? state.cars : [];
    for (const car of cars) {
      let refs = Array.isArray(car.photos) ? car.photos.slice() : [];
      if (!refs.length && car.imageSrc) refs = [car.imageSrc];
      const next = [];
      for (const ref of refs) {
        if (typeof ref !== "string" || !ref) continue;
        if (ref.startsWith("data:image/")) {
          const key = await dataUrlToPhotoKey(ref);
          if (key) {
            next.push(key);
            changed = true;
          }
        } else {
          next.push(ref);
        }
      }
      car.photos = next;
      car.imageSrc = next[0] || "";
    }
    if (changed) saveState();
    for (const lead of leads) {
      for (const ref of lead.photos || []) {
        if (ref.startsWith("photo_"))
          try {
            await photoGet(ref);
          } catch (e) {}
      }
    }
    for (const car of cars) {
      for (const ref of car.photos || []) {
        if (ref.startsWith("photo_"))
          try {
            await photoGet(ref);
          } catch (e) {}
      }
    }
  } catch (e) {
    console.warn("Photo migration failed", e);
  }
}
async function hydrateLeadPhotos() {
  try {
    await openPhotoDB();
    const leads = Array.isArray(state.leadVariants) ? state.leadVariants : [];
    for (const lead of leads) {
      for (const ref of lead.photos || []) {
        if (typeof ref === "string" && ref.startsWith("photo_")) {
          try {
            await photoGet(ref);
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.warn("Lead photo storage unavailable", e);
  }
}
async function hydrateCarPhotos() {
  try {
    await openPhotoDB();
    const cars = Array.isArray(state.cars) ? state.cars : [];
    for (const car of cars) {
      for (const ref of car.photos || []) {
        if (typeof ref === "string" && ref.startsWith("photo_")) {
          try {
            await photoGet(ref);
          } catch (e) {}
        }
      }
      if (car.imageSrc && car.imageSrc.startsWith("photo_")) {
        try {
          await photoGet(car.imageSrc);
        } catch (e) {}
      }
    }
  } catch (e) {
    console.warn("Garage photo storage unavailable", e);
  }
}
async function photoRefsToUrls(refs) {
  return Promise.all(
    (refs || []).map(async ref => {
      if (!ref) return "";
      if (ref.startsWith("data:image/") || ref.startsWith("blob:") || ref.startsWith("http")) return ref;
      try {
        return await photoGet(ref);
      } catch (e) {
        return "";
      }
    })
  );
}
function photoCssUrl(src) {
  return src ? `background-image:url("${String(src).replace(/"/g, "%22")}")` : "";
}
async function leadPhotosToDataUrls(files) {
  const list = Array.from(files || []).filter(f => f && /^image\//i.test(f.type));
  const keys = [];
  for (const file of list) {
    try {
      const key = await storeImageFile(file);
      if (key) {
        keys.push(key);
        await photoGet(key);
      }
    } catch (e) {
      console.warn("Photo skipped", e);
    }
    await new Promise(r => setTimeout(r, 0));
  }
  return keys;
}
