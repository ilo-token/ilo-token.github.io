/** Module for main execution in the browser. */

import { CoveredError } from "./error.ts";
import { translate } from "./old-translator.ts";
import { settings } from "./settings.ts";
import { teloMisikeke } from "../deps.ts";

// Set to false when releasing, set to true when developing
const DEVELOPMENT = true;
// Don't forget these two when releasing
const DATE_RELEASED = new Date("2024-2-1");
const VERSION = "v0.3.0";

type Elements = {
  input: HTMLTextAreaElement;
  output: HTMLUListElement;
  error: HTMLParagraphElement;
  errorList: HTMLParagraphElement;
  translateButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement;
  dialogBox: HTMLDialogElement;
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
    settingsButton: "settings-button",
    dialogBox: "dialog-box",
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
    elements!.error.innerText = "Multiple errors has been found:";
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
    if (!translations.isError()) {
      const output = [...new Set(translations.output)];
      if (settings.get("randomize")) {
        output.sort(() => Math.random() - Math.random());
      }
      outputTranslations(output);
    } else {
      let error: Array<string> = [];
      if (settings.get("use-telo-misikeke")) {
        error = teloMisikeke.errors(source);
      }
      if (error.length === 0) {
        error = [
          ...new Set(
            translations.errors
              .filter((x) => !(x instanceof CoveredError))
              .map((x) => x.message),
          ),
        ];
      }
      outputErrors(error);
    }
  } catch (unreachableError) {
    let error: string;
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
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    loadElements();
    settings.loadFromLocalStorage();
    setVersion();
    // Auto resize
    function resizeTextarea() {
      elements!.input.style.height =
        Math.max(50, elements!.input.scrollHeight) + "px";
    }
    resizeTextarea();
    elements!.input.addEventListener("input", resizeTextarea);
    elements!.settingsButton.addEventListener("click", () => {
      elements!.dialogBox.showModal();
    });
    elements!.confirmButton.addEventListener("click", () => {
      settings.loadFromElements();
      elements!.dialogBox.close();
    });
    elements!.cancelButton.addEventListener("click", () => {
      settings.resetElementsToCurrent();
      elements!.dialogBox.close();
    });
    elements!.resetButton.addEventListener("click", () => {
      settings.resetElementsToDefault();
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
