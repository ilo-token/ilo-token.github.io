/** Module for main execution in the browser. */

import { OutputError, translate } from "./mod.ts";
import { dictionary } from "../dictionary/dictionary.ts";
import { loadCustomDictionary } from "./dictionary.ts";
import { LOCAL_STORAGE_AVAILABLE } from "./misc.ts";
import { settings } from "./settings.ts";
import PROJECT_DATA from "../project-data.json" with { type: "json" };

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
  } as any;
  for (const name of Object.keys(elementNames)) {
    elementNames[name] = document.getElementById(elementNames[name]);
  }
  elements = elementNames;
}
function setVersion(): void {
  if (PROJECT_DATA.onDevelopment) {
    elements!.version.innerText = `${PROJECT_DATA.version} (On development)`;
  } else {
    const date = new Date(PROJECT_DATA.releaseDate).toLocaleDateString(
      undefined,
      {
        dateStyle: "short",
      },
    );
    elements!.version.innerText = `${PROJECT_DATA.version} - Released ${date}`;
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
function addError(error: unknown): void {
  let property: "innerHTML" | "innerText";
  if (error instanceof OutputError && error.htmlMessage) {
    property = "innerHTML";
  } else {
    property = "innerText";
  }
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else {
    message = `${error}`;
  }
  const list = document.createElement("li");
  list[property] = message;
  elements!.errorList.appendChild(list);
}
function outputErrors(errors: Array<unknown>): void {
  if (errors.length === 0) {
    elements!.error.innerText =
      "An unknown error has occurred (Errors should be known, please report " +
      "this)";
  } else if (errors.length === 1) {
    elements!.error.innerText = "An error has been found:";
    addError(errors[0]);
  } else {
    elements!.error.innerText = "Multiple errors has been found:";
    for (const item of errors) {
      addError(item);
    }
  }
}
function updateOutput(): void {
  try {
    clearOutput();
    outputTranslations(translate(elements!.input.value));
  } catch (error) {
    if (error instanceof AggregateError) {
      outputErrors(error.errors);
    } else {
      outputErrors([error]);
    }
  }
}
function addWord(): void {
  const word = elements!.addWord.value.trim();
  let add: string;
  if (/^[a-z][a-zA-Z]*$/.test(word)) {
    if (Object.hasOwn(dictionary, word)) {
      add = `\n${word}:\n  ${dictionary[word].src.trim()}\n`;
    } else {
      add = `\n${word}:\n  # Definitions here\n`;
    }
  } else {
    add = "\n# Error: Invalid word to add (You may remove this line)\n";
  }
  elements!.customDictionary.value += add;
}
function resizeTextarea(): void {
  elements!.input.style.height = "auto";
  elements!.input.style.height = `${`${elements!.input.scrollHeight + 14}`}px`;
}
function openDictionary(): void {
  elements!.customDictionaryBox.showModal();
  if (LOCAL_STORAGE_AVAILABLE) {
    elements!.customDictionary.value = localStorage.getItem(DICTIONARY_KEY) ??
      DEFAULT_MESSAGE;
  }
}
function saveAndCloseDictionary(): void {
  const dictionary = elements!.customDictionary.value;
  const errors = loadCustomDictionary(dictionary);
  if (errors.length === 0) {
    if (LOCAL_STORAGE_AVAILABLE) {
      localStorage.setItem(DICTIONARY_KEY, dictionary);
    }
    elements!.customDictionaryBox.close();
  } else {
    elements!.customDictionary.value +=
      `\n# Please fix these errors before saving\n# (You may remove these when fixed)\n${
        errors.map((error) => `# - ${error.message.trim()}`).join("\n")
      }\n`;
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
    elements!.customDictionaryButton.addEventListener("click", openDictionary);
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
    elements!.saveButton.addEventListener("click", saveAndCloseDictionary);
    elements!.translateButton.addEventListener("click", updateOutput);
    resizeTextarea();
    elements!.input.addEventListener("input", resizeTextarea);
    elements!.input.addEventListener("keydown", (event) => {
      if (event.code === "Enter") {
        event.preventDefault();
        updateOutput();
      }
    });
  });
}
