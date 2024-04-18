/** Module for translation settings stored as a global state */

/** */
type RedundancySettings = "both" | "condensed" | "default only";
type Settings = {
  "use-telo-misikeke": boolean;
  "randomize": boolean;
  "x-ala-x-partial-parsing": boolean;
  "anu-as-content-word": boolean;
  "number-settings": RedundancySettings;
  "tense-settings": RedundancySettings;
};
interface Option<T> {
  default: T;
  updater: Updater<T>;
}
interface SettingsItem<T> extends Option<T> {
  value: T;
}
type Updater<T> = {
  parse: (value: string) => T | null;
  stringify: (value: T) => string;
  load: (input: HTMLInputElement) => T;
  set: (input: HTMLInputElement, value: T) => void;
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
  load(): void {
    for (const name of Object.keys(this.settings)) {
      const settings = this.settings[name];
      const src = localStorage.getItem(name);
      if (typeof src === "string") {
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
  confirm(): void {
    for (const name of Object.keys(this.settings)) {
      const settings = this.settings[name];
      settings.value = settings.updater.load(
        document.getElementById(name) as HTMLInputElement,
      );
      localStorage.setItem(name, settings.updater.stringify(settings.value));
    }
  }
  reset(): void {
    for (const name of Object.keys(this.settings)) {
      const settings = this.settings[name];
      settings.updater.set(
        document.getElementById(name) as HTMLInputElement,
        settings.default,
      );
    }
  }
}
const boolUpdater: Updater<boolean> = {
  parse: (value) => {
    if (value === "true") {
      return true;
    } else if (value === "false") {
      return false;
    } else {
      return null;
    }
  },
  stringify: (value) => value.toString(),
  load: (input) => input.checked,
  set: (input, value) => {
    input.checked = value;
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
    default: false,
    updater: boolUpdater,
  },
  "randomize": {
    default: false,
    updater: boolUpdater,
  },
  "x-ala-x-partial-parsing": {
    default: false,
    updater: boolUpdater,
  },
  "anu-as-content-word": {
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
