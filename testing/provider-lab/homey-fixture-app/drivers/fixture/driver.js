'use strict';

const Homey = require('homey');
const fixtures = require('../../lib/fixtures');

class FixtureDriver extends Homey.Driver {
  async onPairListDevices() {
    return fixtures.map((fixture) => ({
      name: fixture.name,
      data: { id: fixture.id },
      store: {
        deviceClass: fixture.deviceClass,
        initialState: fixture.initialState,
      },
      icon: fixture.icon,
      capabilities: fixture.capabilities,
      capabilitiesOptions: fixture.capabilitiesOptions,
    }));
  }
}

module.exports = FixtureDriver;
