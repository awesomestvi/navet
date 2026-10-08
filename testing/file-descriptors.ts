/** Add open/read/close behavior to the in-memory filesystem used by storage contract tests. */
export function fileDescriptorFixture(readFile: (path: string) => string) {
  let nextId = 1;
  const open = new Map<number, { content: Buffer; offset: number }>();
  return {
    openSync(path: string) {
      const id = nextId++;
      open.set(id, { content: Buffer.from(readFile(path)), offset: 0 });
      return id;
    },
    readSync(id: number, buffer: Buffer, offset: number, length: number) {
      const file = open.get(id);
      if (!file) throw new Error('Bad file descriptor');
      const count = file.content.copy(buffer, offset, file.offset, file.offset + length);
      file.offset += count;
      return count;
    },
    closeSync(id: number) {
      open.delete(id);
    },
  };
}
