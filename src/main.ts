// This code is browser only

import { dictionary } from "../dictionary/dictionary.ts";
import { asComment } from "../dictionary/misc.ts";
import PROJECT_DATA from "../project_data.json" with { type: "json" };
import { ArrayResultError } from "./array_result.ts";
import { loadCustomDictionary } from "./dictionary.ts";
import {
  checkLocalStorage,
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
} from "./settings_frontend.ts";
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

const DICTIONARY_LOADING_FAILED_FIXABLE_MESSAGE =
  "Failed to load custom dictionary. This is mostly likely because the " +
  "syntax has been updated and your custom dictionary still uses the old " +
  "syntax. Please fix it. Apologies for the inconvenience.";
const DICTIONARY_LOADING_FAILED_UNFIXABLE_MESSAGE =
  "Failed to load custom dictionary. Please report this.";
const WORD_NOT_FOUND_MESSAGE = "Error: Word not found.";
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

  const outputList = document.getElementById("output") as HTMLUListElement;
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
  const importWordTextBox = document.getElementById(
    "import-word",
  ) as HTMLInputElement;
  const importWordButton = document.getElementById(
    "import-word-button",
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
  const displayDate = PROJECT_DATA.onDevelopment
    ? "On development"
    : `- Released ${new Date(PROJECT_DATA.releaseDate).toLocaleDateString()}`;

  versionDisplay.innerText = `${PROJECT_DATA.version} ${displayDate}`;

  // load settings
  loadFromLocalStorage();

  // load custom dictionary
  const customDictionary = checkLocalStorage()
    ? localStorage.getItem(DICTIONARY_KEY) ?? ""
    : customDictionaryTextBox.value;
  if (customDictionary.trim() !== "") {
    try {
      loadCustomDictionary(customDictionary);
    } catch (error) {
      errorDisplay.innerText = errorsFixable(flattenError(error))
        ? DICTIONARY_LOADING_FAILED_FIXABLE_MESSAGE
        : DICTIONARY_LOADING_FAILED_UNFIXABLE_MESSAGE;
      // deno-lint-ignore no-console
      console.error(error);
    }
  }

  // remove unused local storage data
  const used = [DICTIONARY_KEY, ...Object.keys(settings)];
  const unused = [...new Array(localStorage.length).keys()]
    .map((i) => localStorage.key(i)!)
    .filter((key) => !used.includes(key));
  for (const key of unused) {
    localStorage.removeItem(key);
  }

  // initial text area size
  resizeTextarea();
  function resizeTextarea(): void {
    inputTextBox.style.height = "auto";
    inputTextBox.style.height = `${inputTextBox.scrollHeight + 14}px`;
  }

  // initialize button label
  updateLabel();
  function updateLabel(): void {
    translateButton.innerText = settings.multiline
      ? TRANSLATE_LABEL_MULTILINE
      : TRANSLATE_LABEL;
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
    outputList.innerHTML = "";
    errorList.innerHTML = "";
    errorDisplay.innerText = "";
    try {
      for (const translation of translate(inputTextBox.value)) {
        const list = document.createElement("li");
        list.innerHTML = translation;
        outputList.appendChild(list);
      }
    } catch (error) {
      const errors = flattenError(error);
      switch (errors.length) {
        case 0:
          errorDisplay.innerText = UNKNOWN_ERROR_MESSAGE;
          break;
        case 1:
          errorDisplay.innerText = SINGULAR_ERROR_MESSAGE;
          break;
        default:
          errorDisplay.innerText = MULTIPLE_ERROR_MESSAGE;
          break;
      }
      for (const item of errors) {
        const property = item instanceof ArrayResultError && item.isHtml
          ? "innerHTML"
          : "innerText";
        const list = document.createElement("li");
        list[property] = extractErrorMessage(item);
        errorList.appendChild(list);
      }
      // deno-lint-ignore no-console
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
  importWordButton.addEventListener("click", importWord);
  importWordTextBox.addEventListener("keydown", (event) => {
    if (event.code === "Enter" && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      importWord();
    }
  });
  function displayToCustomDictionary(message: string): void {
    const original = customDictionaryTextBox.value.trimEnd();
    const append = original === "" ? "" : "\n\n";
    customDictionaryTextBox.value =
      `${original}${append}${message.trimEnd()}\n`;
    customDictionaryTextBox.scrollTo(0, customDictionaryTextBox.scrollHeight);
  }
  function importWord(): void {
    const word = importWordTextBox.value.trim();
    if (/^[a-z][a-zA-Z]*$/.test(word)) {
      const definitions = dictionary.get(word)?.src;
      if (definitions != null) {
        displayToCustomDictionary(`${word}:${definitions}`);
      } else {
        displayToCustomDictionary(asComment(WORD_NOT_FOUND_MESSAGE));
      }
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
      const message = errorsFixable(errors)
        ? DICTIONARY_ERROR_FIXABLE_MESSAGE
        : DICTIONARY_ERROR_UNFIXABLE_MESSAGE;
      const errorListMessage = errors
        .map(extractErrorMessage)
        .map((message) => `\n- ${message.replaceAll(NEWLINES, "$&  ")}`);
      displayToCustomDictionary(asComment(`${message}${errorListMessage}`));
      // deno-lint-ignore no-console
      console.error(error);
    }
  });
  addEventListener("beforeunload", (event) => {
    if (customDictionaryDialogBox.open) {
      event.preventDefault();
    }
  });
}
function errorsFixable(errors: ReadonlyArray<unknown>): boolean {
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
