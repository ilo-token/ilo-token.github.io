/** Module for main execution in the browser. */

import { dictionary } from "../dictionary/dictionary.ts";
import { asComment } from "../dictionary/misc.ts";
import PROJECT_DATA from "../project-data.json" with { type: "json" };
import { ArrayResultError } from "./array-result.ts";
import { loadCustomDictionary } from "./dictionary.ts";
import {
  checkLocalStorage,
  escapeHtmlWithNewline,
  extractErrorMessage,
  flattenError,
  NEWLINES,
  setIgnoreError,
} from "./misc.ts";
import { translate } from "./mod.ts";
import { clearCache } from "./parser/cache.ts";
import {
  loadFromElements,
  loadFromLocalStorage,
  resetElementsToCurrent,
  resetElementsToDefault,
} from "./settings-frontend.ts";
import { settings } from "./settings.ts";

const TRANSLATE_LABEL = "Translate";
const TRANSLATE_LABEL_MULTILINE = "Translate (Ctrl + Enter)";

const UNKNOWN_ERROR_MESSAGE =
  "An unknown error has occurred (Errors should be known, please report " +
  "this).";
const SINGULAR_ERROR_MESSAGE = "An error has been found:";
const MULTIPLE_ERROR_MESSAGE = "Multiple errors has been found:";

const DEFAULT_CUSTOM_DICTIONARY_MESSAGE = `\
====================================
Welcome to Custom Dictionary Editor!
====================================

Here you can customize the dictionary
used in ilo Token. You may change the
definitions of existing words and
even extend ilo Token with more
non-pu words. Just know that the
custom dictionary comes with
limitations. Press Help above to get
started.`;
const EMPTY_DEFINITION_PLACEHOLDER = "Definitions here";

const DICTIONARY_LOADING_FAILED_FIXABLE_MESSAGE =
  "Failed to load custom dictionary. This is mostly likely because the " +
  "syntax has been updated and your custom dictionary still uses the old " +
  "syntax. Please fix it. Apologies for the inconvenience.";
const DICTIONARY_LOADING_FAILED_UNFIXABLE_MESSAGE =
  "Failed to load custom dictionary. Please report this.";
const INVALID_WORD_ERROR =
  "Error: Invalid word to add (You may remove this line).";
const DICTIONARY_ERROR_FIXABLE_MESSAGE =
  "Please fix these errors before saving.\n(You may remove these when fixed)";
const DICTIONARY_ERROR_UNFIXABLE_MESSAGE =
  "Unable to save dictionary due to error. Please report this.";

// never change this
const DICTIONARY_KEY = "dictionary";

function main(): void {
  // load elements
  const inputTextBox = document.getElementById(
    "input",
  ) as HTMLTextAreaElement;

  const outputDisplay = document.getElementById("output") as HTMLUListElement;
  const errorDisplay = document.getElementById(
    "error",
  ) as HTMLParagraphElement;
  const errorList = document.getElementById(
    "error-list",
  ) as HTMLParagraphElement;

  const translateButton = document.getElementById(
    "translate-button",
  ) as HTMLButtonElement;
  const customDictionaryButton = document.getElementById(
    "custom-dictionary-button",
  ) as HTMLButtonElement;
  const settingsButton = document.getElementById(
    "settings-button",
  ) as HTMLButtonElement;

  const settingsDialogBox = document.getElementById(
    "settings-box",
  ) as HTMLDialogElement;
  const confirmButton = document.getElementById(
    "confirm-button",
  ) as HTMLButtonElement;
  const cancelButton = document.getElementById(
    "cancel-button",
  ) as HTMLButtonElement;
  const resetButton = document.getElementById(
    "reset-button",
  ) as HTMLButtonElement;

  const customDictionaryDialogBox = document.getElementById(
    "custom-dictionary-box",
  ) as HTMLDialogElement;
  const addWordTextBox = document.getElementById(
    "add-word",
  ) as HTMLInputElement;
  const addWordButton = document.getElementById(
    "add-word-button",
  ) as HTMLButtonElement;
  const customDictionaryTextBox = document.getElementById(
    "custom-dictionary",
  ) as HTMLTextAreaElement;
  const discardButton = document.getElementById(
    "discard-button",
  ) as HTMLButtonElement;
  const saveButton = document.getElementById(
    "save-button",
  ) as HTMLButtonElement;

  const versionDisplay = document.getElementById(
    "version",
  ) as HTMLAnchorElement;

  // set version
  if (PROJECT_DATA.onDevelopment) {
    versionDisplay.innerText = `${PROJECT_DATA.version} (On development)`;
  } else {
    const date = new Date(PROJECT_DATA.releaseDate)
      .toLocaleDateString(undefined, { dateStyle: "short" });
    versionDisplay.innerText = `${PROJECT_DATA.version} - Released ${date}`;
  }

  // load settings
  loadFromLocalStorage();

  // load custom dictionary
  let customDictionary: string;
  if (checkLocalStorage()) {
    customDictionary = "";
  } else {
    customDictionary = localStorage.getItem(DICTIONARY_KEY) ?? "";
  }
  if (customDictionary.trim() !== "") {
    try {
      loadCustomDictionary(customDictionary);
    } catch (error) {
      let message: string;
      if (errorsFixable(flattenError(error))) {
        message = DICTIONARY_LOADING_FAILED_FIXABLE_MESSAGE;
      } else {
        message = DICTIONARY_LOADING_FAILED_UNFIXABLE_MESSAGE;
      }
      errorDisplay.innerText = escapeHtmlWithNewline(message);
      console.error(error);
    }
  }

  // remove unused local storage data
  const used = [DICTIONARY_KEY, ...Object.keys(settings)];
  const allKeys = [...new Array(localStorage.length).keys()]
    .map((i) => localStorage.key(i)!);
  for (const key of allKeys) {
    if (!used.includes(key)) {
      localStorage.removeItem(key);
    }
  }

  // initial text area size
  resizeTextarea();
  function resizeTextarea(): void {
    inputTextBox.style.height = "auto";
    inputTextBox.style.height = `${`${inputTextBox.scrollHeight + 14}`}px`;
  }

  // initialize button label
  updateLabel();
  function updateLabel(): void {
    if (settings.multiline) {
      translateButton.innerText = TRANSLATE_LABEL_MULTILINE;
    } else {
      translateButton.innerText = TRANSLATE_LABEL;
    }
  }

  // add all event listener
  translateButton.addEventListener("click", updateOutput);
  inputTextBox.addEventListener("input", resizeTextarea);
  inputTextBox.addEventListener("keydown", (event) => {
    if (
      event.code === "Enter" && (event.ctrlKey || !settings.multiline) &&
      !event.altKey && !event.shiftKey
    ) {
      event.preventDefault();
      updateOutput();
    }
  });
  function updateOutput(): void {
    outputDisplay.innerHTML = "";
    errorList.innerHTML = "";
    errorDisplay.innerText = "";
    try {
      for (const translation of translate(inputTextBox.value)) {
        const list = document.createElement("li");
        list.innerHTML = translation;
        outputDisplay.appendChild(list);
      }
    } catch (error) {
      const errors = flattenError(error);
      let message: string;
      switch (errors.length) {
        case 0:
          message = UNKNOWN_ERROR_MESSAGE;
          break;
        case 1:
          message = SINGULAR_ERROR_MESSAGE;
          break;
        default:
          message = MULTIPLE_ERROR_MESSAGE;
          break;
      }
      errorDisplay.innerHTML = escapeHtmlWithNewline(message);
      for (const item of errors) {
        let property: "innerHTML" | "innerText";
        if (item instanceof ArrayResultError && item.isHtml) {
          property = "innerHTML";
        } else {
          property = "innerText";
        }
        const list = document.createElement("li");
        list[property] = extractErrorMessage(item);
        errorList.appendChild(list);
      }
      console.error(error);
    }
  }
  settingsButton.addEventListener("click", () => {
    settingsDialogBox.showModal();
  });
  confirmButton.addEventListener("click", () => {
    loadFromElements();
    updateLabel();
    clearCache();
    settingsDialogBox.close();
  });
  cancelButton.addEventListener("click", () => {
    resetElementsToCurrent();
    updateLabel();
    settingsDialogBox.close();
  });
  resetButton.addEventListener("click", () => {
    resetElementsToDefault();
  });
  customDictionaryButton.addEventListener("click", () => {
    customDictionaryDialogBox.showModal();
    if (checkLocalStorage()) {
      customDictionaryTextBox.value = localStorage.getItem(DICTIONARY_KEY) ??
        `${asComment(DEFAULT_CUSTOM_DICTIONARY_MESSAGE)}\n`;
    }
  });
  addWordButton.addEventListener("click", addWord);
  addWordTextBox.addEventListener("keydown", (event) => {
    if (event.code === "Enter" && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      addWord();
    }
  });
  function displayToCustomDictionary(message: string): void {
    let original = customDictionaryTextBox.value.trimEnd();
    if (original !== "") {
      original += "\n\n";
    }
    customDictionaryTextBox.value = `${original}${message.trimEnd()}\n`;
    customDictionaryTextBox.scrollTo(0, customDictionaryTextBox.scrollHeight);
  }
  function addWord(): void {
    const word = addWordTextBox.value.trim();
    if (/^[a-z][a-zA-Z]*$/.test(word)) {
      let definitions: string;
      const dictionaryEntry = dictionary.get(word);
      if (dictionaryEntry != null) {
        definitions = dictionaryEntry.src;
      } else {
        definitions = `\n${
          asComment(EMPTY_DEFINITION_PLACEHOLDER)
            .replaceAll(/^/gm, "  ")
        }`;
      }
      displayToCustomDictionary(`${word}:${definitions}`);
    } else {
      displayToCustomDictionary(asComment(INVALID_WORD_ERROR));
    }
  }
  discardButton.addEventListener("click", () => {
    customDictionaryDialogBox.close();
  });
  saveButton.addEventListener("click", () => {
    const { value } = customDictionaryTextBox;
    try {
      loadCustomDictionary(value);
      setIgnoreError(DICTIONARY_KEY, value);
      clearCache();
      customDictionaryDialogBox.close();
    } catch (error) {
      const errors = flattenError(error);
      let message: string;
      if (errorsFixable(errors)) {
        message = DICTIONARY_ERROR_FIXABLE_MESSAGE;
      } else {
        message = DICTIONARY_ERROR_UNFIXABLE_MESSAGE;
      }
      const errorListMessage = errors
        .map(extractErrorMessage)
        .map((message) => `\n- ${message.replaceAll(NEWLINES, "$&  ")}`);
      displayToCustomDictionary(asComment(`${message}${errorListMessage}`));
      console.error(error);
    }
  });
  addEventListener("beforeunload", (event) => {
    if (customDictionaryDialogBox.open) {
      event.preventDefault();
    }
  });
}
function errorsFixable(errors: Array<unknown>): boolean {
  return errors.length > 0 &&
    errors.every((error) => error instanceof ArrayResultError);
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
}
