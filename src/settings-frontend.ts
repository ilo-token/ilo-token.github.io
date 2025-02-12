/** Module for translation settings stored as a global state */

import { checkLocalStorage, setIgnoreError } from "./misc.ts";
import {
  defaultSettings,
  RedundancySettings,
  Settings,
  settings,
} from "./settings.ts";

type Updater<T> = {
  readonly parse: (value: string) => T | null;
  readonly stringify: (value: T) => string;
  readonly load: (input: HTMLInputElement | HTMLSelectElement) => T;
  readonly set: (input: HTMLInputElement | HTMLSelectElement, value: T) => void;
};
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
const UPDATERS: Readonly<{ [K in keyof Settings]: Updater<Settings[K]> }> = {
  "use-telo-misikeke": BOOL_UPDATER,
  "randomize": BOOL_UPDATER,
  "number-settings": REDUNDANCY_UPDATER,
  "tense-settings": REDUNDANCY_UPDATER,
  "x-ala-x-partial-parsing": BOOL_UPDATER,
  "separate-repeated-modifiers": BOOL_UPDATER,
};
const NAMES = Object.keys(UPDATERS) as Array<keyof Settings>;
function loadOneFromLocalStorage<T extends keyof Settings>(name: T): void {
  const src = localStorage.getItem(name);
  if (src != null) {
    settings[name] = UPDATERS[name].parse(src) ?? defaultSettings[name];
  } else {
    settings[name] = defaultSettings[name];
  }
  UPDATERS[name].set(
    document.getElementById(name) as HTMLInputElement | HTMLSelectElement,
    settings[name],
  );
}
function loadOneFromElements<T extends keyof Settings>(name: T): void {
  settings[name] = UPDATERS[name].load(
    document.getElementById(name) as HTMLInputElement | HTMLSelectElement,
  );
  setIgnoreError(name, UPDATERS[name].stringify(settings[name]));
}
function setElement<T extends keyof Settings>(
  name: T,
  value: Settings[T],
): void {
  UPDATERS[name].set(
    document.getElementById(name) as HTMLInputElement | HTMLSelectElement,
    value,
  );
}
export function loadFromLocalStorage(): void {
  if (!checkLocalStorage()) {
    return;
  }
  for (const name of NAMES) {
    loadOneFromLocalStorage(name);
  }
}
export function loadFromElements(): void {
  for (const name of NAMES) {
    loadOneFromElements(name);
  }
}
export function resetElementsToCurrent(): void {
  for (const name of NAMES) {
    setElement(name, settings[name]);
  }
}
export function resetElementsToDefault(): void {
  for (const name of NAMES) {
    setElement(name, defaultSettings[name]);
  }
}
