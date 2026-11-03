export const PRODUCT_IMAGE_MAX_BYTES = 25 * 1024 * 1024;
const IMAGE_MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };

export function prepareProductImage(file: File): File {
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) throw new Error(`${file.name}: 한 장에 25MB 이하로 선택해주세요.`);
  const type = file.type.toLowerCase() || IMAGE_MIME[file.name.split('.').pop()?.toLowerCase() ?? ''];
  if (!type || !Object.values(IMAGE_MIME).includes(type)) {
    throw new Error(`${file.name}: JPG, PNG, WEBP, AVIF 이미지를 선택해주세요. HEIC 사진은 JPG로 변환해주세요.`);
  }
  return file.type === type ? file : new File([file], file.name, { type, lastModified: file.lastModified });
}
