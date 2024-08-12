/** Module for translation settings stored as a global state */

/** */
type RedundancySettings = "both" | "condensed" | "default only";
type Settings = {
  "use-telo-misikeke": boolean;
  "randomize": boolean;
  "number-settings": RedundancySettings;
  "tense-settings": RedundancySettings;
};
const LOCAL_STORAGE_AVAILABLE = (() => {
  if (typeof localStorage === "undefined") {
    return false;
  }
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
  try {
    const x = "__storage_test__";
    localStorage.setItem(x, x);
    localStorage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === "QuotaExceededError" ||
        // Firefox
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
      // acknowledge QuotaExceededError only if there's something already stored
      localStorage &&
      localStorage.length > 0
    );
  }
})();
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
    // deno-lint-ignore no-explicit-any
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
const boolUpdater: Updater<boolean> = {
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
const redundancyUpdater: Updater<RedundancySettings> = {
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
    updater: boolUpdater,
  },
  "randomize": {
    default: false,
    updater: boolUpdater,
  },
  "number-settings": {
    default: "both",
    updater: redundancyUpdater,
  },
  "tense-settings": {
    default: "both",
    updater: redundancyUpdater,
  },
});
