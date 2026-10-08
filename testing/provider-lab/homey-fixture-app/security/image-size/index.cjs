const { readFile, readFileSync } = require('node:fs');
const { imageSize } = require('image-size-patched');

// homey-lib promisifies the legacy callable API; image-size 2 exposes a buffer API.
module.exports = function dimensions(input, callback) {
  if (typeof callback !== 'function') {
    return imageSize(typeof input === 'string' ? readFileSync(input) : input);
  }
  const finish = (error, bytes) => {
    if (error) return callback(error);
    let result;
    try {
      result = imageSize(bytes);
    } catch (error) {
      return callback(error);
    }
    callback(null, result);
  };
  if (typeof input === 'string') return readFile(input, finish);
  queueMicrotask(() => finish(null, input));
};
