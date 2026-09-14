'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

function load(relativePath, base) {
  const context = {
    require: (id) => {
      assert.equal(id, 'homey');
      return base;
    },
    module: { exports: {} },
  };
  vm.runInNewContext(readFileSync(path.join(__dirname, '..', relativePath), 'utf8'), context);
  return context.module.exports;
}

test('scene flows control the paired light and welcome notification is not duplicated on restart', async () => {
  const values = {};
  const notifications = [];
  const settings = new Map();
  let runScene;
  const App = load('app.js', { App: class {} });
  const app = new App();
  app.log = () => {};
  app.homey = {
    flow: { getActionCard: () => ({ registerRunListener: (listener) => { runScene = listener; } }) },
    drivers: { getDriver: () => ({ getDevices: () => [{
      getData: () => ({ id: 'living-room-ceiling' }),
      setCapabilityValue: async (id, value) => { values[id] = value; },
    }] }) },
    notifications: { createNotification: async ({ excerpt }) => { notifications.push(excerpt); } },
    settings: { get: (key) => settings.get(key), set: (key, value) => settings.set(key, value) },
  };
  await app.onInit();
  await app.onInit();
  assert.equal(notifications.length, 1);
  await runScene({ scene: 'evening' });
  assert.deepEqual(values, { onoff: true, dim: 0.3 });
  await runScene({ scene: 'morning' });
  assert.deepEqual(values, { onoff: true, dim: 0.85 });
  assert.equal(notifications.length, 3);
});

test('climate history records changing samples without resetting stored controls and stops on deletion', async () => {
  const Device = load('drivers/fixture/device.js', { Device: class {} });
  const device = new Device();
  const values = { target_temperature: 24, measure_temperature: 22, measure_humidity: 50 };
  let tick;
  let cleared = false;
  device.homey = {
    setInterval: (callback, interval) => {
      assert.equal(interval, 60000);
      tick = callback;
      return 123;
    },
    clearInterval: (id) => { assert.equal(id, 123); cleared = true; },
  };
  device.getStoreValue = (key) => key === 'initialState' ? { target_temperature: 21.5 } : 'thermostat';
  device.getClass = () => 'thermostat';
  device.getCapabilities = () => Object.keys(values);
  device.getCapabilityValue = (id) => values[id];
  device.setCapabilityValue = async (id, value) => { values[id] = value; };
  device.registerCapabilityListener = () => {};
  device.getData = () => ({ id: 'living-room-climate' });
  device.getName = () => 'Living room climate';
  device.log = () => {};
  device.error = (error) => { throw error; };
  await device.onInit();
  assert.equal(values.target_temperature, 24);
  tick();
  await Promise.resolve();
  assert.notEqual(values.measure_temperature, 22);
  assert.equal(values.target_temperature, 24);
  await device.onDeleted();
  assert.equal(cleared, true);
});

// Keep: scene/history tests above verify behavior rather than duplicating fixture definitions.
async function pairedDevice(values) {
  const Device = load('drivers/fixture/device.js', { Device: class {} });
  const device = new Device();
  const listeners = {};
  let finishMovement;
  device.homey = {
    setTimeout: (callback) => { finishMovement = callback; return 123; },
    clearTimeout: () => { finishMovement = undefined; },
  };
  listeners.finishMovement = async () => {
    if (finishMovement) finishMovement();
    await Promise.resolve();
  };
  device.getStoreValue = () => undefined;
  device.getData = () => ({ id: 'manual-demo' });
  device.getClass = () => 'other';
  device.getName = () => 'Manual demo';
  device.getCapabilities = () => Object.keys(values);
  device.getCapabilityValue = (id) => values[id] ?? null;
  device.hasCapability = (id) => Object.hasOwn(values, id);
  device.setCapabilityValue = async (id, value) => { values[id] = value; };
  device.registerCapabilityListener = (id, listener) => { listeners[id] = listener; };
  device.log = () => {};
  await device.onInit();
  return listeners;
}

test('curtain open, close, position and stop controls keep reported state consistent', async () => {
  const values = { windowcoverings_state: 'idle', windowcoverings_set: 0.65, windowcoverings_closed: false };
  const controls = await pairedDevice(values);
  await controls.windowcoverings_state('down');
  // Model Homey's application of the original command after the listener resolves.
  values.windowcoverings_state = 'down';
  await controls.finishMovement();
  assert.deepEqual(values, { windowcoverings_state: 'idle', windowcoverings_set: 0, windowcoverings_closed: true });
  await controls.windowcoverings_state('up');
  values.windowcoverings_state = 'up';
  await controls.finishMovement();
  assert.equal(values.windowcoverings_set, 1);
  assert.equal(values.windowcoverings_closed, false);
  await controls.windowcoverings_set(0);
  assert.equal(values.windowcoverings_closed, true);
  await controls.windowcoverings_closed(false);
  assert.equal(values.windowcoverings_set, 1);
  await controls.windowcoverings_state('idle');
  assert.equal(values.windowcoverings_state, 'idle');
});

test('speaker track buttons advance and wrap metadata without becoming persistent toggle states', async () => {
  const values = { speaker_track: 'Morning light', speaker_next: null, speaker_prev: null };
  const controls = await pairedDevice(values);
  await controls.speaker_next(true);
  assert.equal(values.speaker_track, 'Coffee break');
  await controls.speaker_prev(true);
  assert.equal(values.speaker_track, 'Morning light');
  await controls.speaker_prev(true);
  assert.equal(values.speaker_track, 'Evening calm');
  assert.equal(values.speaker_next, null);
  assert.equal(values.speaker_prev, null);
});
