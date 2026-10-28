// Nuotraukų ir dokumentų suspaudimas (v68).
// Nuotraukos: ilgoji kraštinė iki 2400 px, JPEG 0,86 (WebP – tik jei naršyklė tikrai jį sukuria). Telefone ir
// kompiuteryje skirtumo akimi nesimato, o failas būna kelis kartus mažesnis. Anksčiau buvo 900 px ir kokybė 0,45,
// o „Safari“ vietoje WebP grąžindavo didžiulį PNG.
// Dokumentai: JPG ir WebP čekiai ar sąskaitos perkoduojami tuo pačiu formatu, PDF ir PNG paliekami tokie, kokie yra
// (PDF jau suspaustas viduje, o PNG – tikslus vaizdas). Jei suspaustas failas nebūtų bent 10 % mažesnis,
// paliekamas originalas.
const CMP_MAX_SIDE_V68 = 2400;
async function cmpDecodeV68(blob) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch (e) {
      try {
        return await createImageBitmap(blob);
      } catch (e2) {}
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error("image"));
    };
    img.src = url;
  });
}
function cmpToBlobV68(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(b => resolve(b), type, quality));
}
// Grąžina suspaustą Blob arba null, jei suspausti nepavyko / neapsimoka.
async function cmpImageV68(
  blob,
  { types = ["image/jpeg"], quality = 0.86, maxSide = CMP_MAX_SIDE_V68 } = {}
) {
  if (!blob || !/^image\//i.test(blob.type || "")) return null;
  let src;
  try {
    src = await cmpDecodeV68(blob);
  } catch (e) {
    return null;
  }
  const w0 = src.width || src.naturalWidth,
    h0 = src.height || src.naturalHeight;
  if (!w0 || !h0) return null;
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w0 * scale));
  canvas.height = Math.max(1, Math.round(h0 * scale));
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  if (src.close) src.close();
  for (const type of types) {
    const out = await cmpToBlobV68(canvas, type, quality);
    // „Safari“ nepalaikomą formatą tyliai pakeičia PNG – tokio rezultato nenaudojame
    if (out && out.type === type) return out;
  }
  return null;
}
// Nuotraukos (automobiliai, variantai): naudoja storeImageFile → compressPhoto
compressPhoto = async function (file) {
  if (!file || !/^image\//i.test(file.type || "")) return null;
  const out = await cmpImageV68(file, { types: ["image/webp", "image/jpeg"], quality: 0.86 });
  if (!out) return file;
  return out.size < file.size * 0.9 ? out : file;
};
// Dokumentai (čekiai, sąskaitos, sutartys): JPG / WebP – suspaudžiami tuo pačiu formatu
const __readDocumentFileV68 = readDocumentFile;
readDocumentFile = async function (f) {
  const blob = await __readDocumentFileV68(f);
  if (blob.type !== "image/jpeg" && blob.type !== "image/webp") return blob;
  try {
    const out = await cmpImageV68(blob, { types: [blob.type], quality: 0.88 });
    return out && out.size < blob.size * 0.9 ? out : blob;
  } catch (e) {
    return blob;
  }
};
