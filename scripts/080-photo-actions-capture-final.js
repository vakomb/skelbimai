(function () {
  if (window.__photoActionsCaptureFinal) return;
  window.__photoActionsCaptureFinal = true;
  document.addEventListener(
    "click",
    async function (e) {
      const download = e.target?.closest?.("#sheet #downloadCarPhotos");
      if (download) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const id = window.__openCarId;
        if (id && typeof downloadAllEntityPhotos === "function") {
          try {
            await downloadAllEntityPhotos("car", id);
          } catch (err) {
            console.error(err);
          }
        }
        return;
      }
      const del = e.target?.closest?.("#sheet [data-car-photo-delete]");
      if (del) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const id = window.__openCarId;
        const car = typeof state !== "undefined" ? state.cars.find(c => c.id === id) : null;
        const idx = Number(del.dataset.carPhotoDelete);
        const refs = Array.isArray(car?.photos) ? car.photos : [];
        const ref = refs[idx];
        if (!car || !ref || del.dataset.busy === "1") return;
        del.dataset.busy = "1";
        if (!window.confirm("Ištrinti šią nuotrauką?")) {
          del.dataset.busy = "0";
          return;
        }
        car.photos = refs.filter((_, i) => i !== idx);
        car.imageSrc = car.photos[0] || "";
        try {
          await photoDelete(ref);
        } catch (err) {
          console.warn(err);
        }
        try {
          delete photoUrlCache[ref];
        } catch (err) {}
        saveState();
        render();
        setTimeout(() => openCar(car.id), 0);
      }
    },
    true
  );
})();
