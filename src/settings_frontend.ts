// This code is browser only

import { toKebabCase } from "@std/text/to-kebab-case";
import { checkLocalStorage, setIgnoreError } from "./misc.ts";
import {
  defaultSettings,
  RedundancySettings,
  Settings,
  settings,
} from "./settings.ts";

type Updater<T> = Readonly<{
  parse: (value: string) => null | T;
  stringify: (value: T) => string;
  load: (input: HTMLInputElement | HTMLSelectElement) => T;
  set: (input: HTMLInputElement | HTMLSelectElement, value: T) => void;
}>;
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
  stringify: (value) => value ? "T" : "F",
  load: (input) => (input as HTMLInputElement).checked,
  set: (input, value) => {
    (input as HTMLInputElement).checked = value;
  },
};
const REDUNDANCY_UPDATER: Updater<RedundancySettings> = {
  parse: (value) =>
    ["both", "condensed", "default only"].includes(value)
      ? value as RedundancySettings
      : null,
  stringify: (value) => value,
  load: ({ value }) => value as RedundancySettings,
  set: (input, value) => {
    input.value = value;
  },
};
const UPDATERS: Readonly<{ [K in keyof Settings]: Updater<Settings[K]> }> = {
  teloMisikeke: BOOL_UPDATER,
  randomize: BOOL_UPDATER,
  multiline: BOOL_UPDATER,
  quantity: REDUNDANCY_UPDATER,
  tense: REDUNDANCY_UPDATER,
  xAlaXPartialParsing: BOOL_UPDATER,
  separateRepeatedModifiers: BOOL_UPDATER,
};
const KEYS = Object.keys(UPDATERS) as ReadonlyArray<keyof Settings>;
function loadOneFromLocalStorage<T extends keyof Settings>(key: T): void {
  const src = localStorage.getItem(key);
  if (src != null) {
    settings[key] = UPDATERS[key].parse(src) ?? defaultSettings[key];
  } else {
    settings[key] = defaultSettings[key];
  }
  UPDATERS[key].set(
    document.getElementById(toKebabCase(key)) as
      | HTMLInputElement
      | HTMLSelectElement,
    settings[key],
  );
}
function loadOneFromElements<T extends keyof Settings>(key: T): void {
  settings[key] = UPDATERS[key].load(
    document.getElementById(toKebabCase(key)) as
      | HTMLInputElement
      | HTMLSelectElement,
  );
  setIgnoreError(key, UPDATERS[key].stringify(settings[key]));
}
function setElement<T extends keyof Settings>(
  key: T,
  value: Settings[T],
): void {
  UPDATERS[key].set(
    document.getElementById(toKebabCase(key)) as
      | HTMLInputElement
      | HTMLSelectElement,
    value,
  );
}
export function loadFromLocalStorage(): void {
  if (checkLocalStorage()) {
    for (const key of KEYS) {
      loadOneFromLocalStorage(key);
    }
  }
}
export function loadFromElements(): void {
  for (const key of KEYS) {
    loadOneFromElements(key);
  }
}
export function resetElementsToCurrent(): void {
  for (const key of KEYS) {
    setElement(key, settings[key]);
  }
}
export function resetElementsToDefault(): void {
  for (const key of KEYS) {
    setElement(key, defaultSettings[key]);
  }
}
