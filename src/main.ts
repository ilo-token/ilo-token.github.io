/** Module for main execution in the browser. */

import { translate } from "./composer.ts";
import { defaultDictionary, loadCustomDictionary } from "./dictionary.ts";
import { fs, shuffle } from "./misc.ts";
import { settings } from "./settings.ts";
import { errors } from "../telo-misikeke/telo-misikeke.js";

// Set to false when releasing, set to true when developing
const DEVELOPMENT = true;
// Don't forget these two when releasing
const DATE_RELEASED = new Date("2024-8-15");
const VERSION = "v0.3.1";

const DEFAULT_MESSAGE = `\
# ====================================
# Welcome to Custom Dictionary Editor!
# ====================================
#
# Here you can customize the dictionary
# used in ilo Token. You may change the
# definitions of existing words and
# even extend ilo Token with more
# non-pu words. Press Help above to get
# started.
`;
const DICTIONARY_KEY = "custom-dictionary";

type Elements = {
  input: HTMLTextAreaElement;

  output: HTMLUListElement;
  error: HTMLParagraphElement;
  errorList: HTMLParagraphElement;
  version: HTMLAnchorElement;

  translateButton: HTMLButtonElement;
  customDictionaryButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement;

  settingsBox: HTMLDialogElement;
  confirmButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;

  customDictionaryBox: HTMLDialogElement;
  addWord: HTMLInputElement;
  addWordButton: HTMLButtonElement;
  customDictionary: HTMLTextAreaElement;
  discardButton: HTMLButtonElement;
  saveButton: HTMLButtonElement;
};
/** A map of all HTML elements that are used here. */
let elements: undefined | Elements;

function loadElements(): void {
  const elementNames = {
    input: "input",

    output: "output",
    error: "error",
    errorList: "error-list",
    version: "version",

    translateButton: "translate-button",
    customDictionaryButton: "custom-dictionary-button",
    settingsButton: "settings-button",

    settingsBox: "settings-box",
    confirmButton: "confirm-button",
    cancelButton: "cancel-button",
    resetButton: "reset-button",

    customDictionaryBox: "custom-dictionary-box",
    addWord: "add-word",
    addWordButton: "add-word-button",
    customDictionary: "custom-dictionary",
    discardButton: "discard-button",
    saveButton: "save-button",
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
      "An unknown error has occurred (Errors should be known, please report " +
      "this)";
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
    setVersion();
    settings.loadFromLocalStorage();
    if (
      loadCustomDictionary(localStorage.getItem(DICTIONARY_KEY) ?? "")
        .length > 0
    ) {
      elements!.error.innerText =
        "Failed to load custom dictionary. This is mostly like because the " +
        "dictionary syntax has changed. To fix, open the custom dictionary " +
        "editor.";
    }
    // Auto resize
    function resizeTextarea(): void {
      elements!.input.style.height = "auto";
      elements!.input.style.height = fs`${`${
        Math.max(50, elements!.input.scrollHeight + 20)
      }`}px`;
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
      elements!.customDictionary.value = localStorage.getItem(DICTIONARY_KEY) ??
        DEFAULT_MESSAGE;
    });
    function addWord(): void {
      const word = elements!.addWord.value.trim();
      let add: string;
      if (/^[a-z][a-zA-Z]*$/.test(word)) {
        if (Object.hasOwn(defaultDictionary, word)) {
          add = fs`\n${word}:\n  ${defaultDictionary[word].src.trim()}\n`;
        } else {
          add = fs`\n${word}:\n  # Definitions here\n`;
        }
      } else {
        add = "\n# Error: Invalid word to add (You may remove this line)\n";
      }
      elements!.customDictionary.value += add;
    }
    elements!.addWordButton.addEventListener("click", addWord);
    elements!.addWord.addEventListener("keydown", (event) => {
      if (event.code === "Enter") {
        event.preventDefault();
        addWord();
      }
    });
    elements!.discardButton.addEventListener("click", () => {
      elements!.customDictionaryBox.close();
    });
    elements!.saveButton.addEventListener("click", () => {
      const dictionary = elements!.customDictionary.value;
      const errors = loadCustomDictionary(dictionary);
      if (errors.length === 0) {
        localStorage.setItem(DICTIONARY_KEY, dictionary);
        elements!.customDictionaryBox.close();
      } else {
        elements!.customDictionary.value +=
          fs`\n# Please fix these errors before saving\n# (You may remove these when fixed)\n${
            errors.map((error) => fs`# - ${error.message.trim()}`).join("\n")
          }\n`;
      }
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
