declare const storage: {
  CHUNK_BYTES: number;
  encode(
    document: unknown,
    maxBytes: number,
    hash: (value: string) => string,
    writeChunk: (key: string, chunk: unknown) => void
  ): unknown;
  decode(
    document: unknown,
    hash: (value: string) => string,
    readChunk: (key: string) => unknown
  ): unknown;
};
export default storage;
