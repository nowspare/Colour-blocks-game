// User settings with sane defaults, persisted to localStorage
import { storage } from './storage.js';

const DEFAULTS = Object.freeze({
  sound: true,
  haptics: true,
  gridlines: true
});

function load() {
  const saved = storage.get('settings', {});
  return { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

export const settings = {
  data: load(),
  save() { storage.set('settings', this.data); },
  get(key) { return this.data[key]; },
  set(key, value) {
    this.data[key] = value;
    this.save();
    return value;
  },
  defaults: DEFAULTS
};
