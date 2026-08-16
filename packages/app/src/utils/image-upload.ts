const DEFAULT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function validateImageFile(
  file: File,
  maxSizeBytes = DEFAULT_MAX_IMAGE_SIZE_BYTES
): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Please upload an image file';
  }

  if (file.size > maxSizeBytes) {
    return 'Image size should be less than 5MB';
  }

  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;

      if (typeof result === 'string') {
        resolve(result);
        return;
      }

      reject(new Error('Failed to read image file'));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };

    reader.readAsDataURL(file);
  });
}

export async function prepareAvatarImageDataUrl(file: File): Promise<string> {
  const source = await readFileAsDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Failed to decode image file'));
    element.src = source;
  });
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Failed to prepare image file');
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('Image file has no usable dimensions');
  }

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.84);
}
