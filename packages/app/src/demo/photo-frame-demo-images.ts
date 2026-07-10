import beachFriendsAvif from '@assets/reference/photo-frame/beach-friends.avif';
import beachFriendsWebp from '@assets/reference/photo-frame/beach-friends.webp';
import cityCafeAvif from '@assets/reference/photo-frame/city-cafe.avif';
import cityCafeWebp from '@assets/reference/photo-frame/city-cafe.webp';
import countryWalkAvif from '@assets/reference/photo-frame/country-walk.avif';
import countryWalkWebp from '@assets/reference/photo-frame/country-walk.webp';
import desertFriendsAvif from '@assets/reference/photo-frame/desert-friends.avif';
import desertFriendsWebp from '@assets/reference/photo-frame/desert-friends.webp';
import nightOutAvif from '@assets/reference/photo-frame/night-out.avif';
import nightOutWebp from '@assets/reference/photo-frame/night-out.webp';
import type { PhotoFrameImage } from '@navet/app/features/dashboard/components/widgets/photo-frame-image';

function createPhotoFrameImage(avif: string, webp: string): PhotoFrameImage {
  return {
    src: webp,
    sources: [
      { srcSet: avif, type: 'image/avif' },
      { srcSet: webp, type: 'image/webp' },
    ],
  };
}

export const PHOTO_FRAME_DEMO_IMAGES: readonly PhotoFrameImage[] = [
  createPhotoFrameImage(countryWalkAvif, countryWalkWebp),
  createPhotoFrameImage(nightOutAvif, nightOutWebp),
  createPhotoFrameImage(desertFriendsAvif, desertFriendsWebp),
  createPhotoFrameImage(cityCafeAvif, cityCafeWebp),
  createPhotoFrameImage(beachFriendsAvif, beachFriendsWebp),
];

export const PHOTO_FRAME_DEMO_URLS = PHOTO_FRAME_DEMO_IMAGES.map((image) => image.src);
