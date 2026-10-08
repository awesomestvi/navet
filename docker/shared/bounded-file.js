// Open once and cap the bytes actually read. Atomic path replacement cannot bypass the limit.
function readBoundedText(fs, path, maxBytes, tooLarge) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new Error('Invalid file read limit');
  const descriptor = fs.openSync(path, 'r');
  const chunks = [];
  let total = 0;
  try {
    while (total <= maxBytes) {
      const buffer = Buffer.alloc(Math.min(64 * 1024, maxBytes + 1 - total));
      const count = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (count === 0) return Buffer.concat(chunks, total).toString('utf8');
      total += count;
      if (total > maxBytes) {
        throw tooLarge ? tooLarge() : new Error('File exceeds its safe read limit');
      }
      chunks.push(buffer.subarray(0, count));
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

export default { readBoundedText };
