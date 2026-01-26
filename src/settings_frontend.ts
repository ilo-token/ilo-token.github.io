// this code is browser only

import { toKebabCase } from "@std/text/to-kebab-case";
import { checkLocalStorage, setIgnoreError } from "./misc/misc.ts";
import { defaultSettings, Redundancy, Settings, settings } from "./settings.ts";

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
const REDUNDANCY_UPDATER: Updater<Redundancy> = {
  parse: (value) =>
    ["both", "condensed", "default only"].includes(value)
      ? value as Redundancy
      : null,
  stringify: (value) => value,
  load: ({ value }) => value as Redundancy,
  set: (input, value) => {
    input.value = value;
  },
};
const UPDATERS: Readonly<{ [K in keyof Settings]: Updater<Settings[K]> }> = {
  randomize: BOOL_UPDATER,
  multiline: BOOL_UPDATER,
  sandbox: BOOL_UPDATER,
  quantity: REDUNDANCY_UPDATER,
  tense: REDUNDANCY_UPDATER,
};
const KEYS = Object.keys(UPDATERS) as ReadonlyArray<keyof Settings>;

function loadOneFromLocalStorage<T extends keyof Settings>(key: T) {
  const source = localStorage.getItem(key);
  if (source != null) {
    settings[key] = UPDATERS[key].parse(source) ?? defaultSettings[key];
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
function loadOneFromDom<T extends keyof Settings>(key: T) {
  settings[key] = UPDATERS[key].load(
    document.getElementById(toKebabCase(key)) as
      | HTMLInputElement
      | HTMLSelectElement,
  );
  setIgnoreError(key, UPDATERS[key].stringify(settings[key]));
}
function setDom<T extends keyof Settings>(
  key: T,
  value: Settings[T],
) {
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
export function loadFromDom(): void {
  for (const key of KEYS) {
    loadOneFromDom(key);
  }
}
export function resetDomToCurrent(): void {
  for (const key of KEYS) {
    setDom(key, settings[key]);
  }
}
export function resetDomToDefault(): void {
  for (const key of KEYS) {
    setDom(key, defaultSettings[key]);
  }
}
