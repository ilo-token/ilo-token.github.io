/** Module for main execution. */

import { CoveredError } from "./error.ts";
import { translate } from "./translator.ts";
import { defaultSettings, RedundancySettings, settings } from "./settings.ts";
import { teloMisikeke } from "../deps.ts";

// Set to false when releasing, set to true when developing
const DEVELOPMENT = true;
// Don't forget these two when releasing
const DATE_RELEASED = new Date("2024-2-1");
const VERSION = "v0.2.3";

type Elements = {
  input: HTMLTextAreaElement;
  output: HTMLUListElement;
  error: HTMLParagraphElement;
  errorList: HTMLParagraphElement;
  translateButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement;
  dialogBox: HTMLDialogElement;
  confirmButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  version: HTMLAnchorElement;
  useTeloMisikeke: HTMLInputElement;
  randomize: HTMLInputElement;
  number: HTMLSelectElement;
  tense: HTMLSelectElement;
  xAlaXPartialParsing: HTMLInputElement;
};
/** A map of all HTML elements that are used here. */
let elements: undefined | Elements;

function loadElements(): void {
  elements = {
    input: document.getElementById("input") as HTMLTextAreaElement,
    output: document.getElementById("output") as HTMLUListElement,
    error: document.getElementById("error") as HTMLParagraphElement,
    errorList: document.getElementById(
      "error-list",
    ) as HTMLParagraphElement,
    translateButton: document.getElementById(
      "translate-button",
    ) as HTMLButtonElement,
    settingsButton: document.getElementById(
      "settings-button",
    ) as HTMLButtonElement,
    dialogBox: document.getElementById(
      "dialog-box",
    ) as HTMLDialogElement,
    confirmButton: document.getElementById(
      "confirm-button",
    ) as HTMLButtonElement,
    resetButton: document.getElementById("reset-button") as HTMLButtonElement,
    version: document.getElementById("version") as HTMLAnchorElement,
    useTeloMisikeke: document.getElementById(
      "use-telo-misikeke",
    ) as HTMLInputElement,
    randomize: document.getElementById("randomize") as HTMLInputElement,
    number: document.getElementById("number") as HTMLSelectElement,
    tense: document.getElementById("tense") as HTMLSelectElement,
    xAlaXPartialParsing: document.getElementById(
      "x-ala-x-parsing",
    ) as HTMLInputElement,
  };
}
function setVersion(): void {
  if (DEVELOPMENT) {
    elements!.version.innerText = `${VERSION} (On development)`;
  } else {
    const date = DATE_RELEASED.toLocaleDateString(undefined, {
      dateStyle: "short",
    });
    elements!.version.innerText = `${VERSION} - Released ${date}`;
  }
}
function clearOutput(): void {
  while (elements!.output.children.length > 0) {
    elements!.output.removeChild(elements!.output.children[0]);
  }
  while (elements!.errorList.children.length > 0) {
    elements!.errorList.removeChild(elements!.errorList.children[0]);
  }
  elements!.error.innerText = "";
}
function outputTranslations(output: Array<string>): void {
  for (const translation of output) {
    const list = document.createElement("li");
    list.innerText = translation;
    elements!.output.appendChild(list);
  }
}
function outputErrors(errors: Array<string>): void {
  if (errors.length === 0) {
    elements!.error.innerText =
      "An unknown error has occurred (Errors should be known, please report this)";
  } else if (errors.length === 1) {
    elements!.error.innerText = errors[0];
  } else {
    elements!.error.innerText =
      "Multiple errors has been found, but only at least one could be helpful:";
    for (const errorMessage of errors) {
      const list = document.createElement("li");
      list.innerText = errorMessage;
      elements!.errorList.appendChild(list);
    }
  }
}
function updateOutput(): void {
  clearOutput();
  const source = elements!.input.value;
  try {
    const translations = translate(source);
    if (translations.isError()) {
      let error: Array<string> = [];
      if (settings.useTeloMisikeke) {
        error = teloMisikeke.errors(source);
      }
      if (error.length === 0) {
        error = [
          ...new Set(
            translations.errors.filter((x) => !(x instanceof CoveredError)).map(
              (x) => x.message,
            ),
          ),
        ];
      }
      outputErrors(error);
    } else {
      const output = [...new Set(translations.output)];
      if (settings.randomize) {
        output.sort(() => Math.random() - Math.random());
      }
      outputTranslations(output);
    }
  } catch (unreachableError) {
    let error;
    if (unreachableError instanceof Error) {
      error = unreachableError.message;
    } else {
      error = unreachableError?.toString() + "";
    }
    error += " (please report this)";
    outputErrors([error]);
    throw unreachableError;
  }
}
function loadSettings(): void {
  function setBool<
    T extends "useTeloMisikeke" | "randomize" | "xAlaXPartialParsing",
  >(name: T, element: HTMLInputElement): void {
    const x = localStorage.getItem(name);
    let value: boolean;
    if (x == null) {
      value = defaultSettings[name];
    } else {
      value = x === "true";
    }
    settings[name] = value;
    element.checked = value;
  }
  function setRedundancy<T extends "number" | "tense">(
    name: T,
    element: HTMLSelectElement,
  ): void {
    const x = localStorage.getItem(name) ?? defaultSettings[name];
    if (["both", "condensed", "default only"].includes(x)) {
      settings[name] = x as RedundancySettings;
      element.value = x;
    } else {
      settings[name] = defaultSettings[name];
      element.value = defaultSettings[name];
    }
  }
  setBool("useTeloMisikeke", elements!.useTeloMisikeke);
  setBool("randomize", elements!.randomize);
  setBool("xAlaXPartialParsing", elements!.xAlaXPartialParsing);
  setRedundancy("number", elements!.number);
  setRedundancy("tense", elements!.tense);
}
function confirmSettings(): void {
  function setBool<
    T extends "useTeloMisikeke" | "randomize" | "xAlaXPartialParsing",
  >(name: T, element: HTMLInputElement) {
    const value = element.checked;
    localStorage.setItem(name, value.toString());
    settings[name] = value;
  }
  function setRedundancy<T extends "number" | "tense">(
    name: T,
    element: HTMLSelectElement,
  ): void {
    const value = element.value as RedundancySettings;
    localStorage.setItem(name, value.toString());
    settings[name] = value;
  }
  setBool("useTeloMisikeke", elements!.useTeloMisikeke);
  setBool("randomize", elements!.randomize);
  setBool("xAlaXPartialParsing", elements!.xAlaXPartialParsing);
  setRedundancy("number", elements!.number);
  setRedundancy("tense", elements!.tense);
}
function resetSettings(): void {
  function setBool<
    T extends "useTeloMisikeke" | "randomize" | "xAlaXPartialParsing",
  >(name: T, element: HTMLInputElement) {
    element.checked = defaultSettings[name];
  }
  function setRedundancy<T extends "number" | "tense">(
    name: T,
    element: HTMLSelectElement,
  ): void {
    element.value = defaultSettings[name];
  }
  setBool("useTeloMisikeke", elements!.useTeloMisikeke);
  setBool("randomize", elements!.randomize);
  setBool("xAlaXPartialParsing", elements!.xAlaXPartialParsing);
  setRedundancy("number", elements!.number);
  setRedundancy("tense", elements!.tense);
}
document.addEventListener("DOMContentLoaded", () => {
  loadElements();
  setVersion();
  loadSettings();
  elements!.settingsButton.addEventListener("click", () => {
    elements!.dialogBox.showModal();
  });
  elements!.confirmButton.addEventListener("click", () => {
    confirmSettings();
    elements!.dialogBox.close();
  });
  elements!.resetButton.addEventListener("click", resetSettings);
  elements!.translateButton.addEventListener("click", updateOutput);
  elements!.input.addEventListener("keydown", (event) => {
    if (event.code === "Enter") {
      event.preventDefault();
      updateOutput();
    }
  });
});
