import type * as fs from 'node:fs';

declare const boundedFile: {
  readBoundedText(
    fileSystem: Pick<typeof fs, 'openSync' | 'readSync' | 'closeSync'>,
    path: string,
    maxBytes: number,
    tooLarge?: () => Error
  ): string;
};
export default boundedFile;
