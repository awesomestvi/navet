'use strict';

const Homey = require('homey');

class FixtureDevice extends Homey.Device {
  async onInit() {
    const deviceClass = this.getStoreValue('deviceClass');
    if (deviceClass && this.getClass() !== deviceClass) {
      await this.setClass(deviceClass);
    }

    const initialState = this.getStoreValue('initialState') ?? {};
    for (const capabilityId of this.getCapabilities()) {
      if (Object.hasOwn(initialState, capabilityId) && this.getCapabilityValue(capabilityId) === null) {
        await this.setCapabilityValue(capabilityId, initialState[capabilityId]);
      }

      this.registerCapabilityListener(capabilityId, async (value) => {
        await this.setCapabilityValue(capabilityId, value);
      });
    }

    this.log(`Fixture ready as ${this.getClass()}: ${this.getName()}`);
  }
}

module.exports = FixtureDevice;
