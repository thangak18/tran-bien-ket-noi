export interface CompressedImageResult {
  dataUrl: string;
  blob?: Blob;
  width: number;
  height: number;
}

/**
 * Nén ảnh client-side qua HTML Canvas (spec 7, UT-035.2)
 * Cạnh dài tối đa maxDimension (mặc định 1280px), chất lượng JPEG (mặc định 0.8)
 */
export function compressImage(
  fileOrDataUrl: File | Blob | string,
  maxDimension = 1280,
  quality = 0.8
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const loadImage = (src: string) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Không thể khởi tạo canvas 2D'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        if (canvas.toBlob) {
          canvas.toBlob(
            (blob) => {
              resolve({
                dataUrl,
                blob: blob || undefined,
                width,
                height,
              });
            },
            'image/jpeg',
            quality
          );
        } else {
          resolve({
            dataUrl,
            width,
            height,
          });
        }
      };
      img.onerror = () => {
        reject(new Error('Không thể tải hoặc xử lý ảnh.'));
      };
      img.src = src;
    };

    if (typeof fileOrDataUrl === 'string') {
      loadImage(fileOrDataUrl);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          loadImage(e.target.result);
        } else {
          reject(new Error('Đọc file ảnh thất bại'));
        }
      };
      reader.onerror = () => reject(new Error('Đọc file ảnh thất bại'));
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
