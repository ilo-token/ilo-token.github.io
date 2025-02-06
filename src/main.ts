/** Module for main execution in the browser. */

import { translate } from "./mod.ts";
import { OutputError } from "./output.ts";
import { dictionary } from "../dictionary/dictionary.ts";
import { loadCustomDictionary } from "./dictionary.ts";
import { checkLocalStorage, setIgnoreError } from "./misc.ts";
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

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
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

    function updateOutput(): void {
      // clear output
      outputDisplay.innerHTML = "";
      errorList.innerHTML = "";
      errorDisplay.innerText = "";
      try {
        // display translations
        for (const translation of translate(inputTextBox.value)) {
          const list = document.createElement("li");
          list.innerHTML = translation;
          outputDisplay.appendChild(list);
        }
      } catch (error) {
        // Display errors
        let errors: Array<unknown>;
        if (error instanceof AggregateError) {
          errors = error.errors;
        } else {
          errors = [error];
        }
        if (errors.length === 0) {
          errorDisplay.innerText =
            "An unknown error has occurred (Errors should be known, please report " +
            "this)";
        } else if (errors.length === 1) {
          errorDisplay.innerText = "An error has been found:";
        } else {
          errorDisplay.innerText = "Multiple errors has been found:";
        }
        for (const item of errors) {
          let property: "innerHTML" | "innerText";
          if (item instanceof OutputError && item.htmlMessage) {
            property = "innerHTML";
          } else {
            property = "innerText";
          }
          let message: string;
          if (item instanceof Error) {
            message = item.message;
          } else {
            message = `${item}`;
          }
          const list = document.createElement("li");
          list[property] = message;
          errorList.appendChild(list);
        }
        console.error(error);
      }
    }
    function addWord(): void {
      const word = addWordTextBox.value.trim();
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
      customDictionaryTextBox.value += add;
    }
    function resizeTextarea(): void {
      inputTextBox.style.height = "auto";
      inputTextBox.style.height = `${`${inputTextBox.scrollHeight + 14}`}px`;
    }
    // set version
    if (PROJECT_DATA.onDevelopment) {
      versionDisplay.innerText = `${PROJECT_DATA.version} (On development)`;
    } else {
      const date = new Date(PROJECT_DATA.releaseDate).toLocaleDateString(
        undefined,
        {
          dateStyle: "short",
        },
      );
      versionDisplay.innerText = `${PROJECT_DATA.version} - Released ${date}`;
    }
    // load settings
    settings.loadFromLocalStorage();
    // load custom dictionary
    try {
      loadCustomDictionary(localStorage.getItem(DICTIONARY_KEY) ?? "");
    } catch (error) {
      let message: string;
      if (
        error instanceof OutputError ||
        (error instanceof AggregateError &&
          error.errors.every((error) => error instanceof OutputError))
      ) {
        message =
          "Failed to load custom dictionary. This is mostly like because the " +
          "dictionary syntax has changed. Please fix it.";
      } else {
        message = "Failed to load custom dictionary.";
      }
      errorDisplay.innerText = message;
      console.error(error);
    }
    // initial text area size
    resizeTextarea();
    // add all event listener
    settingsButton.addEventListener("click", () => {
      settingsDialogBox.showModal();
    });
    confirmButton.addEventListener("click", () => {
      settings.loadFromElements();
      settingsDialogBox.close();
    });
    cancelButton.addEventListener("click", () => {
      settings.resetElementsToCurrent();
      settingsDialogBox.close();
    });
    resetButton.addEventListener("click", () => {
      settings.resetElementsToDefault();
    });
    customDictionaryButton.addEventListener("click", () => {
      customDictionaryDialogBox.showModal();
      if (checkLocalStorage()) {
        customDictionaryTextBox.value = localStorage.getItem(DICTIONARY_KEY) ??
          DEFAULT_MESSAGE;
      }
    });
    addWordButton.addEventListener("click", addWord);
    addWordTextBox.addEventListener("keydown", (event) => {
      if (event.code === "Enter") {
        event.preventDefault();
        addWord();
      }
    });
    discardButton.addEventListener("click", () => {
      customDictionaryDialogBox.close();
    });
    saveButton.addEventListener("click", () => {
      const dictionary = customDictionaryTextBox.value;
      try {
        loadCustomDictionary(dictionary);
        setIgnoreError(DICTIONARY_KEY, dictionary);
        customDictionaryDialogBox.close();
      } catch (error) {
        let fixable: boolean;
        let errors: Array<string>;
        if (error instanceof OutputError) {
          fixable = true;
          errors = [error.message];
        } else if (
          error instanceof AggregateError &&
          error.errors.every((error) => error instanceof OutputError)
        ) {
          fixable = true;
          errors = error.errors.map((error) => error.message);
        } else if (error instanceof Error) {
          fixable = false;
          errors = [error.message];
        } else {
          fixable = false;
          errors = [`${error}`];
        }
        if (fixable) {
          customDictionaryTextBox.value +=
            "\n# Please fix these errors before saving\n# (You may remove these when fixed)\n";
        } else {
          customDictionaryTextBox.value +=
            "\n# Errors have occurred, please report this.\n";
        }
        for (const message of errors) {
          customDictionaryTextBox.value += `# - ${message}\n`;
        }
        console.error(error);
      }
    });
    translateButton.addEventListener("click", updateOutput);
    inputTextBox.addEventListener("input", resizeTextarea);
    inputTextBox.addEventListener("keydown", (event) => {
      if (event.code === "Enter") {
        event.preventDefault();
        updateOutput();
      }
    });
    addEventListener("beforeunload", (event) => {
      if (customDictionaryDialogBox.open) {
        event.preventDefault();
      }
    });
  });
}
