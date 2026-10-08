const { test } = require('node:test');
const assert = require('node:assert/strict');
const { promisify } = require('node:util');
const parseuri = require('parseuri');
const imageSize = require('image-size');

test('legacy Homey socket callers retain host, port and query fields', () => {
  assert.equal(parseuri('https://homey.local:443/socket?a=b').host, 'homey.local');
  assert.equal(parseuri('wss://[fd00::1]:123/socket').host, 'fd00::1');
  assert.equal(parseuri('wss://[fd00::1]:123/socket').port, '123');
  assert.equal(parseuri('homey.local:123').host, 'homey.local');
  assert.equal(parseuri('https://homey.local/socket?a=b').query, 'a=b');
  assert.equal(parseuri('https://homey.local/' + 'a'.repeat(100000)).host, 'homey.local');
});

test('legacy Homey image callbacks and promises use the patched parser', async () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
    'base64'
  );
  assert.equal(imageSize(png).width, 1);
  assert.equal((await promisify(imageSize)(png)).height, 1);
  const icns = Buffer.alloc(16);
  icns.write('icns');
  icns.writeUInt32BE(16, 4);
  icns.write('ic07', 8);
  assert.throws(() => imageSize(icns));
  await assert.rejects(promisify(imageSize)(icns));
});
