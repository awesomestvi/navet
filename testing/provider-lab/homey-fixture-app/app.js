'use strict';

const Homey = require('homey');

class NavetProviderLabApp extends Homey.App {
  async onInit() {
    this.log('Navet Provider Lab initialized');
  }
}

module.exports = NavetProviderLabApp;
