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

export const PHOTO_FRAME_DEMO_IMAGES = [
  {
    src: countryWalkWebp,
    sources: [
      { srcSet: countryWalkAvif, type: 'image/avif' },
      { srcSet: countryWalkWebp, type: 'image/webp' },
    ],
  },
  {
    src: nightOutWebp,
    sources: [
      { srcSet: nightOutAvif, type: 'image/avif' },
      { srcSet: nightOutWebp, type: 'image/webp' },
    ],
  },
  {
    src: desertFriendsWebp,
    sources: [
      { srcSet: desertFriendsAvif, type: 'image/avif' },
      { srcSet: desertFriendsWebp, type: 'image/webp' },
    ],
  },
  {
    src: cityCafeWebp,
    sources: [
      { srcSet: cityCafeAvif, type: 'image/avif' },
      { srcSet: cityCafeWebp, type: 'image/webp' },
    ],
  },
  {
    src: beachFriendsWebp,
    sources: [
      { srcSet: beachFriendsAvif, type: 'image/avif' },
      { srcSet: beachFriendsWebp, type: 'image/webp' },
    ],
  },
] as const satisfies readonly PhotoFrameImage[];

export const PHOTO_FRAME_DEMO_URLS = PHOTO_FRAME_DEMO_IMAGES.map((image) => image.src);
