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

      if (capabilityId === 'speaker_next' || capabilityId === 'speaker_prev') {
        this.registerCapabilityListener(capabilityId, async () => {
          const tracks = ['Morning light', 'Coffee break', 'Evening calm'];
          const current = tracks.indexOf(this.getCapabilityValue('speaker_track'));
          const next = (Math.max(0, current) + (capabilityId === 'speaker_next' ? 1 : tracks.length - 1)) % tracks.length;
          await this.setCapabilityValue('speaker_track', tracks[next]);
        });
        continue;
      }

      this.registerCapabilityListener(capabilityId, async (value) => {
        // Virtual curtains complete movement immediately; idle also exercises Stop.
        if (capabilityId === 'windowcoverings_state' && (value === 'up' || value === 'down')) {
          await this.setCapabilityValue('windowcoverings_set', value === 'up' ? 1 : 0);
          await this.setCapabilityValue('windowcoverings_closed', value === 'down');
          // Homey applies the submitted movement value after the listener resolves.
          // Report completion afterwards so the cover does not remain "opening/closing".
          if (this.movementTimeout) this.homey.clearTimeout(this.movementTimeout);
          this.movementTimeout = this.homey.setTimeout(() => {
            this.setCapabilityValue('windowcoverings_state', 'idle')
              .catch((error) => this.error('Unable to finish demo curtain movement', error));
          }, 100);
          return;
        }
        if (capabilityId === 'windowcoverings_set' && this.hasCapability('windowcoverings_closed')) {
          await this.setCapabilityValue('windowcoverings_closed', value === 0);
        }
        if (capabilityId === 'windowcoverings_closed' && this.hasCapability('windowcoverings_set')) {
          await this.setCapabilityValue('windowcoverings_set', value ? 0 : 1);
        }
        await this.setCapabilityValue(capabilityId, value);
      });
    }

    // Numeric capability updates are recorded by Homey's normal device Insights logs.
    // Only the dedicated climate fixture is simulated; other manually changed values persist.
    if (this.getData().id === 'living-room-climate') {
      this.historyTick = 0;
      this.historyInterval = this.homey.setInterval(() => {
        this.historyTick += 1;
        Promise.all([
          this.setCapabilityValue('measure_temperature', Number((21.6 + Math.sin(this.historyTick / 4) * 0.8).toFixed(2))),
          this.setCapabilityValue('measure_humidity', 46 + (this.historyTick % 7)),
        ]).catch((error) => this.error('Unable to update demo Insights values', error));
      }, 60000);
    }

    this.log(`Fixture ready as ${this.getClass()}: ${this.getName()}`);
  }

  async onUninit() {
    if (this.movementTimeout) this.homey.clearTimeout(this.movementTimeout);
    if (this.historyInterval) this.homey.clearInterval(this.historyInterval);
  }

  async onDeleted() {
    await this.onUninit();
  }
}

module.exports = FixtureDevice;
