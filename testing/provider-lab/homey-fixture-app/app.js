'use strict';

const Homey = require('homey');

class NavetProviderLabApp extends Homey.App {
  async onInit() {
    this.homey.flow.getActionCard('lab-scene').registerRunListener(async ({ scene }) => {
      const devices = this.homey.drivers.getDriver('fixture').getDevices();
      const light = devices.find((device) => device.getData().id === 'living-room-ceiling');
      if (!light) throw new Error('Pair the Living room ceiling fixture first.');
      await light.setCapabilityValue('onoff', true);
      await light.setCapabilityValue('dim', scene === 'evening' ? 0.3 : 0.85);
      await this.homey.notifications.createNotification({
        excerpt: scene === 'evening' ? 'Navet Lab: Evening scene started' : 'Navet Lab: Morning scene started',
      });
      return true;
    });

    // Seed once per installation, rather than duplicating notifications on every restart.
    if (!this.homey.settings.get('welcomeNotificationCreated')) {
      await this.homey.notifications.createNotification({
        excerpt: 'Navet Lab: Demo devices, flows, moods and Insights are ready for testing.',
      });
      this.homey.settings.set('welcomeNotificationCreated', true);
    }
    this.log('Navet Provider Lab initialized');
  }
}

module.exports = NavetProviderLabApp;
