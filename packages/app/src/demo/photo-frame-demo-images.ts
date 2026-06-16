import type { PhotoFrameImage } from '@navet/app/features/dashboard/components/widgets/photo-frame-image';

function createPhotoFrameImage(name: string): PhotoFrameImage {
  return {
    src: `/assets/reference/photo-frame/${name}.webp`,
    sources: [
      { srcSet: `/assets/reference/photo-frame/${name}.avif`, type: 'image/avif' },
      { srcSet: `/assets/reference/photo-frame/${name}.webp`, type: 'image/webp' },
    ],
  };
}

export const PHOTO_FRAME_DEMO_IMAGES: readonly PhotoFrameImage[] = [
  createPhotoFrameImage('country-walk'),
  createPhotoFrameImage('night-out'),
  createPhotoFrameImage('desert-friends'),
  createPhotoFrameImage('city-cafe'),
  createPhotoFrameImage('beach-friends'),
];

export const PHOTO_FRAME_DEMO_URLS = PHOTO_FRAME_DEMO_IMAGES.map((image) => image.src);
