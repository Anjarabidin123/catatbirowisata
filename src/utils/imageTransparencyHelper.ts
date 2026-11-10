/**
 * Helper untuk pembersihan gambar tanda tangan & stempel:
 * - Menghapus latar belakang kertas (putih, abu-abu, bayangan) menjadi transparan murni (PNG)
 * - Memutar orientasi gambar (90°, 180°, 270°) agar tidak miring/menceng
 * - Mempertegas tinta (Hitam pekat resmi atau Biru dokumen)
 */

export interface ProcessImageOptions {
  rotationDeg?: number; // 0, 90, 180, 270
  threshold?: number; // 100 - 250 (default: 195)
  tintColor?: "original" | "black" | "blue";
  maxDim?: number; // default: 640
}

/**
 * Memproses gambar secara client-side menggunakan HTML5 Canvas
 */
export function processSignatureOrStampImage(
  imageSource: string,
  options: ProcessImageOptions = {}
): Promise<string> {
  const rotationDeg = options.rotationDeg ?? 0;
  const threshold = options.threshold ?? 195;
  const tintColor = options.tintColor ?? "original";
  const maxDim = options.maxDim ?? 640;

  return new Promise((resolve, reject) => {
    if (!imageSource) return resolve("");

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const normRot = ((rotationDeg % 360) + 360) % 360;
        const isSideways = normRot === 90 || normRot === 270;
        const targetW = isSideways ? img.height : img.width;
        const targetH = isSideways ? img.width : img.height;

        // Skalakan ukuran maksimal agar tidak berat di memori & storage
        let finalW = targetW;
        let finalH = targetH;
        if (finalW > maxDim || finalH > maxDim) {
          if (finalW > finalH) {
            finalH = Math.round((finalH * maxDim) / finalW);
            finalW = maxDim;
          } else {
            finalW = Math.round((finalW * maxDim) / finalH);
            finalH = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, finalW);
        canvas.height = Math.max(1, finalH);
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          return resolve(imageSource);
        }

        // 1. Gambar dengan rotasi
        ctx.save();
        ctx.translate(finalW / 2, finalH / 2);
        ctx.rotate((normRot * Math.PI) / 180);
        if (isSideways) {
          ctx.drawImage(img, -finalH / 2, -finalW / 2, finalH, finalW);
        } else {
          ctx.drawImage(img, -finalW / 2, -finalH / 2, finalW, finalH);
        }
        ctx.restore();

        // 2. Manipulasi piksel untuk transparansi background kertas
        const imgData = ctx.getImageData(0, 0, finalW, finalH);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a === 0) continue;

          // Hitung kecerahan (luminance)
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

          if (luminance >= threshold) {
            // Background kertas putih/abu-abu -> 100% Transparan
            data[i + 3] = 0;
          } else {
            // Goresan tinta: berikan anti-aliasing halus pada batas tepi
            if (luminance > threshold - 30) {
              const transition = (threshold - luminance) / 30;
              data[i + 3] = Math.min(255, Math.max(0, Math.round(a * transition)));
            }

            // Opsi penguatan warna tinta
            if (tintColor === "black") {
              data[i] = 15; // Slate-900 black
              data[i + 1] = 23;
              data[i + 2] = 42;
            } else if (tintColor === "blue") {
              data[i] = 37; // Royal blue ink
              data[i + 1] = 99;
              data[i + 2] = 235;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // 3. Auto-crop: Cari bounding box piksel tinta aktif agar gambar tidak lonjong/kurus akibat border persegi panjang
        let minX = finalW;
        let minY = finalH;
        let maxX = 0;
        let maxY = 0;
        let hasInk = false;

        for (let y = 0; y < finalH; y++) {
          for (let x = 0; x < finalW; x++) {
            const idx = (y * finalW + x) * 4;
            const alpha = data[idx + 3];
            if (alpha > 15) {
              hasInk = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (hasInk && maxX > minX && maxY > minY) {
          const pad = 4;
          const cropX = Math.max(0, minX - pad);
          const cropY = Math.max(0, minY - pad);
          const cropW = Math.min(finalW - cropX, maxX - minX + pad * 2);
          const cropH = Math.min(finalH - cropY, maxY - minY + pad * 2);

          const cropCanvas = document.createElement("canvas");
          cropCanvas.width = Math.max(1, cropW);
          cropCanvas.height = Math.max(1, cropH);
          const cropCtx = cropCanvas.getContext("2d");
          if (cropCtx) {
            cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            return resolve(cropCanvas.toDataURL("image/png", 0.95));
          }
        }

        resolve(canvas.toDataURL("image/png", 0.95));
      } catch (err) {
        console.error("Gagal memproses transparansi gambar:", err);
        resolve(imageSource);
      }
    };

    img.onerror = () => {
      resolve(imageSource);
    };

    img.src = imageSource;
  });
}
