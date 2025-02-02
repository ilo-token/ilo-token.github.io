/** Module for translation settings stored as a global state */

import { LOCAL_STORAGE_AVAILABLE } from "./misc.ts";

/**
 * Options for determining how to show different forms or conjugations of nouns
 * or verbs. See
 * https://github.com/ilo-token/ilo-token.github.io/wiki/Settings-Help#singular-and-plural-forms--verb-tenses
 * for more info
 */
export type RedundancySettings = "both" | "condensed" | "default only";
export type Settings = {
  "use-telo-misikeke": boolean;
  "randomize": boolean;
  "number-settings": RedundancySettings;
  "tense-settings": RedundancySettings;
  "x-ala-x-partial-parsing": boolean;
  "separate-repeated-modifiers": boolean;
};
const NAMES = [
  "use-telo-misikeke",
  "randomize",
  "number-settings",
  "tense-settings",
  "x-ala-x-partial-parsing",
  "separate-repeated-modifiers",
] as const;

type Option<T> = {
  default: T;
  updater: Updater<T>;
};
type SettingsItem<T> = Option<T> & {
  value: T;
};
type Updater<T> = {
  parse: (value: string) => T | null;
  stringify: (value: T) => string;
  load: (input: HTMLInputElement | HTMLSelectElement) => T;
  set: (input: HTMLInputElement | HTMLSelectElement, value: T) => void;
};
class Setter<T extends { [name: string]: unknown }> {
  private settings: { [S in keyof T]: SettingsItem<T[S]> };
  constructor(option: { [S in keyof T]: Option<T[S]> }) {
    const settings: any = {};
    for (const name of Object.keys(option)) {
      const item = option[name];
      settings[name] = {
        value: item.default,
        default: item.default,
        updater: item.updater,
      };
    }
    this.settings = settings;
  }
  setUnsaved<S extends keyof T>(name: S, value: T[S]): void {
    this.settings[name].value = value;
  }
  setUnsavedAll(settings: Partial<Settings>) {
    for (const name of NAMES) {
      if (settings[name] != null) {
        this.settings[name].value = settings[name] as any;
      }
    }
  }
  get<S extends keyof T>(name: S): T[S] {
    return this.settings[name].value as T[S];
  }
  /** This function is for browser only. */
  loadFromLocalStorage(): void {
    if (!LOCAL_STORAGE_AVAILABLE) {
      return;
    }
    for (const name of Object.keys(this.settings)) {
      const settings = this.settings[name];
      const src = localStorage.getItem(name);
      if (src != null) {
        settings.value = settings.updater.parse(src) ?? settings.default;
      } else {
        settings.value = settings.default;
      }
      settings.updater.set(
        document.getElementById(name) as HTMLInputElement,
        settings.value,
      );
    }
  }
  /** This function is for browser only. */
  loadFromElements(): void {
    for (const name of Object.keys(this.settings)) {
      const settings = this.settings[name];
      settings.value = settings.updater.load(
        document.getElementById(name) as HTMLInputElement | HTMLSelectElement,
      );
      if (LOCAL_STORAGE_AVAILABLE) {
        localStorage.setItem(name, settings.updater.stringify(settings.value));
      }
    }
  }
  /** This function is for browser only. */
  resetElementsToCurrent(): void {
    for (const name of Object.keys(this.settings)) {
      const settings = this.settings[name];
      settings.updater.set(
        document.getElementById(name) as HTMLInputElement | HTMLSelectElement,
        settings.value,
      );
    }
  }
  /** This function is for browser only. */
  resetElementsToDefault(): void {
    for (const name of Object.keys(this.settings)) {
      const settings = this.settings[name];
      settings.updater.set(
        document.getElementById(name) as HTMLInputElement | HTMLSelectElement,
        settings.default,
      );
    }
  }
}
const BOOL_UPDATER: Updater<boolean> = {
  parse: (value) => {
    switch (value) {
      case "T":
        return true;
      case "F":
        return false;
      default:
        return null;
    }
  },
  stringify: (value) => {
    if (value) {
      return "T";
    } else {
      return "F";
    }
  },
  load: (input) => (input as HTMLInputElement).checked,
  set: (input, value) => {
    (input as HTMLInputElement).checked = value;
  },
};
const REDUNDANCY_UPDATER: Updater<RedundancySettings> = {
  parse: (value) => {
    if (["both", "condensed", "default only"].includes(value)) {
      return value as RedundancySettings;
    } else {
      return null;
    }
  },
  stringify: (value) => value,
  load: (input) => input.value as RedundancySettings,
  set: (input, value) => {
    input.value = value;
  },
};
export const settings = new Setter<Settings>({
  "use-telo-misikeke": {
    default: true,
    updater: BOOL_UPDATER,
  },
  "randomize": {
    default: false,
    updater: BOOL_UPDATER,
  },
  "number-settings": {
    default: "both",
    updater: REDUNDANCY_UPDATER,
  },
  "tense-settings": {
    default: "both",
    updater: REDUNDANCY_UPDATER,
  },
  "x-ala-x-partial-parsing": {
    default: false,
    updater: BOOL_UPDATER,
  },
  "separate-repeated-modifiers": {
    default: false,
    updater: BOOL_UPDATER,
  },
});
