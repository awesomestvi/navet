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
