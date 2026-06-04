export interface PhotoFrameImageSource {
  srcSet: string;
  type: 'image/avif' | 'image/webp';
}

export interface PhotoFrameImage {
  src: string;
  sources?: readonly PhotoFrameImageSource[];
}
