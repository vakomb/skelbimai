# Sujungia kelias ekrano nuotraukas į vieną peržiūros paveikslėlį. Naudojimas: python3 contact-sheet.py out.png max_h scale a.png b.png ...
import sys, cv2, numpy as np
out, maxh, scale = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
ims = []
for f in sys.argv[4:]:
    im = cv2.imread(f)[:maxh]
    ims.append(cv2.copyMakeBorder(im, 0, maxh - im.shape[0], 0, 14, cv2.BORDER_CONSTANT, value=(205, 205, 205)))
cv2.imwrite(out, cv2.resize(np.hstack(ims), None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA))
