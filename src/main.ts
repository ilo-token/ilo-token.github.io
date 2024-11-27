/** Module for main execution in the browser. */

import { translate } from "./composer.ts";
import { fs, shuffle } from "./misc.ts";
import { settings } from "./settings.ts";
import { errors } from "telo-misikeke/telo-misikeke.js";

// Set to false when releasing, set to true when developing
const DEVELOPMENT = true;
// Don't forget these two when releasing
const DATE_RELEASED = new Date("2024-8-15");
const VERSION = "v0.3.1";

type Elements = {
  input: HTMLTextAreaElement;
  output: HTMLUListElement;
  error: HTMLParagraphElement;
  errorList: HTMLParagraphElement;
  translateButton: HTMLButtonElement;
  customDictionaryButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement;
  settingsBox: HTMLDialogElement;
  customDictionaryBox:HTMLDialogElement;
  confirmButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  version: HTMLAnchorElement;
};
/** A map of all HTML elements that are used here. */
let elements: undefined | Elements;

function loadElements(): void {
  const elementNames = {
    input: "input",
    output: "output",
    error: "error",
    errorList: "error-list",
    translateButton: "translate-button",
    customDictionaryButton: "custom-dictionary-button",
    settingsButton: "settings-button",
    settingsBox: "settings-box",
    customDictionaryBox: "custom-dictionary-box",
    confirmButton: "confirm-button",
    cancelButton: "cancel-button",
    resetButton: "reset-button",
    version: "version",
    // deno-lint-ignore no-explicit-any
  } as any;
  for (const name of Object.keys(elementNames)) {
    elementNames[name] = document.getElementById(elementNames[name]);
  }
  elements = elementNames;
}
function setVersion(): void {
  if (DEVELOPMENT) {
    elements!.version.innerText = fs`${VERSION} (On development)`;
  } else {
    const date = DATE_RELEASED.toLocaleDateString(undefined, {
      dateStyle: "short",
    });
    elements!.version.innerText = fs`${VERSION} - Released ${date}`;
  }
}
function clearOutput(): void {
  elements!.output.innerHTML = "";
  elements!.errorList.innerHTML = "";
  elements!.error.innerText = "";
}
function outputTranslations(output: Array<string>): void {
  for (const translation of output) {
    const list = document.createElement("li");
    list.innerHTML = translation;
    elements!.output.appendChild(list);
  }
}
function outputErrors(errors: Array<string>, asHtml: boolean): void {
  let property: "innerText" | "innerHTML";
  if (asHtml) {
    property = "innerHTML";
  } else {
    property = "innerText";
  }
  if (errors.length === 0) {
    elements!.error.innerText =
      "An unknown error has occurred (Errors should be known, please report this)";
  } else if (errors.length === 1) {
    elements!.error.innerText = "An error has been found:";
    const list = document.createElement("li");
    list[property] = errors[0];
    elements!.errorList.appendChild(list);
  } else {
    elements!.error.innerText = "Multiple errors has been found:";
    for (const errorMessage of errors) {
      const list = document.createElement("li");
      list[property] = errorMessage;
      elements!.errorList.appendChild(list);
    }
  }
}
function updateOutput(): void {
  clearOutput();
  const source = elements!.input.value;
  try {
    const translations = translate(source);
    if (!translations.isError()) {
      const output = [...new Set(translations.output)];
      if (settings.get("randomize")) {
        shuffle(output);
      }
      outputTranslations(output);
    } else {
      let asHtml = true;
      let error: Array<string> = [];
      if (settings.get("use-telo-misikeke")) {
        error = errors(source);
      }
      if (error.length === 0) {
        error = [
          ...new Set(
            translations.errors.map((x) => x.message),
          ),
        ];
        asHtml = false;
      }
      outputErrors(error, asHtml);
    }
  } catch (unreachableError) {
    let error: string;
    if (unreachableError instanceof Error) {
      error = unreachableError.message;
    } else {
      error = `${unreachableError}`;
    }
    error += " (please report this)";
    outputErrors([error], false);
    throw unreachableError;
  }
}
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    loadElements();
    settings.loadFromLocalStorage();
    setVersion();
    // Auto resize
    function resizeTextarea() {
      elements!.input.style.height = "auto";
      elements!.input.style.height = `${
        Math.max(50, elements!.input.scrollHeight + 20)
      }px`;
    }
    resizeTextarea();
    elements!.input.addEventListener("input", resizeTextarea);
    elements!.settingsButton.addEventListener("click", () => {
      elements!.settingsBox.showModal();
    });
    elements!.confirmButton.addEventListener("click", () => {
      settings.loadFromElements();
      elements!.settingsBox.close();
    });
    elements!.cancelButton.addEventListener("click", () => {
      settings.resetElementsToCurrent();
      elements!.settingsBox.close();
    });
    elements!.resetButton.addEventListener("click", () => {
      settings.resetElementsToDefault();
    });
    elements!.customDictionaryButton.addEventListener("click", () => {
      elements!.customDictionaryBox.showModal();
    });
    elements!.translateButton.addEventListener("click", updateOutput);
    elements!.input.addEventListener("keydown", (event) => {
      if (event.code === "Enter") {
        event.preventDefault();
        updateOutput();
      }
    });
  });
}
