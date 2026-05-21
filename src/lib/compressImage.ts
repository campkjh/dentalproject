/** 이미지를 maxPx 이하로 리사이징 + JPEG 압축 (용량 과다 업로드 방지) */
export async function compressImage(
  file: File,
  maxPx = 2000,
  quality = 0.85,
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width <= maxPx && height <= maxPx && file.size < 2 * 1024 * 1024) {
        // 충분히 작으면 원본 반환
        resolve(file);
        return;
      }
      if (width > height) {
        height = Math.round((height / width) * maxPx);
        width = maxPx;
      } else {
        width = Math.round((width / height) * maxPx);
        height = maxPx;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas 초기화 실패')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('이미지 압축 실패')); return; }
          const outName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          resolve(new File([blob], outName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지 로드 실패'));
    };
    img.src = objectUrl;
  });
}
