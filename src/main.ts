// this code is browser only

import BrowserDetector from "browser-dtector";
import { dictionary } from "../dictionary/dictionary.ts";
import { dictionaryParser } from "../dictionary/parser.ts";
import PROJECT_DATA from "../project_data.json" with { type: "json" };
import { Result, ResultError } from "./compound.ts";
import { loadCustomDictionary } from "./dictionary.ts";
import { checkLocalStorage, setIgnoreError } from "./local_storage.ts";
import { PositionedError } from "./parser/parser_lib.ts";
import { settings } from "./settings.ts";
import {
  loadFromDom,
  loadFromLocalStorage,
  resetDomToCurrent,
  resetDomToDefault,
} from "./settings_frontend.ts";
import { translate } from "./translator/translator.ts";
import { closestString } from "@std/text/closest-string";

const DICTIONARY_AUTO_PARSE_THRESHOLD = 5000;
const INITIAL_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 25248;

// never change this
const DICTIONARY_KEY = "dictionary";

const TRANSLATE_LABEL = "Translate";
const TRANSLATE_LABEL_MULTILINE = "Translate (Ctrl + Enter)";

const UNKNOWN_ERROR_MESSAGE =
  "An unknown error has occurred (Errors should be known, please report " +
  "this).";
const SINGULAR_ERROR_MESSAGE = "An error has been found:";
const MULTIPLE_ERROR_MESSAGE = "Multiple errors has been found:";

const DEFAULT_CUSTOM_DICTIONARY_MESSAGE = `\
# ====================================
# Welcome to Custom Dictionary Editor!
# ====================================
#
# Here you can customize the dictionary
# used in ilo Token. You may change the
# definitions of existing words and
# even extend ilo Token with more
# non-pu words. Just know that the
# custom dictionary comes with
# limitations. Press Help above to get
# started.
`;

const DICTIONARY_LOADING_FAILED_MESSAGE =
  "Failed to load custom dictionary. This is mostly likely because the " +
  "syntax has been updated and your custom dictionary still uses the old " +
  "syntax. Please fix it. Apologies for the inconvenience.";
const NO_WORD_MESSAGE = "Please provide a word";
const WORD_NOT_FOUND_MESSAGE = (word: string, suggestion: string) =>
  `"${word}" doesn't exist in the dictionary. Maybe you mean "${suggestion}".`;
const WORD_ALREADY_IMPORTED_MESSAGE = (word: string) =>
  `"${word}" is already imported`;
const DICTIONARY_ERROR_MESSAGE = "Please fix the errors before saving";

function main() {
  // load DOM
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
  const loadMoreButton = document.getElementById(
    "load-more-button",
  ) as HTMLButtonElement;

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
  const customDictionaryErrorSummary = document.getElementById(
    "custom-dictionary-error-summary",
  ) as HTMLElement;
  const customDictionaryErrorList = document.getElementById(
    "custom-dictionary-error-list",
  ) as HTMLUListElement;
  const discardButton = document.getElementById(
    "discard-button",
  ) as HTMLButtonElement;
  const saveButton = document.getElementById(
    "save-button",
  ) as HTMLButtonElement;

  const alertBox = document.getElementById("alert-box") as HTMLDialogElement;
  const message = document.getElementById("message") as HTMLParagraphElement;
  const closeButton = document.getElementById(
    "close-button",
  ) as HTMLButtonElement;

  const errorBox = document.getElementById("error-box") as HTMLDialogElement;
  const errorCode = document.getElementById("error-code") as HTMLElement;
  const browserDetails = document.getElementById(
    "browser-details",
  ) as HTMLElement;
  const errorCloseButton = document.getElementById(
    "error-close-button",
  ) as HTMLButtonElement;

  const versionDisplay = document.getElementById(
    "version",
  ) as HTMLAnchorElement;

  // determines whether the dictionary can be automatically parsed
  function autoParse() {
    return customDictionaryTextBox.value.length <=
      DICTIONARY_AUTO_PARSE_THRESHOLD;
  }

  // emulates `window.alert`
  function showMessage(useMessage: string) {
    message.innerText = useMessage;
    alertBox.showModal();
  }

  // handle error
  addEventListener("error", (event) => {
    errorCode.innerText = event.message;
    const details = new BrowserDetector(navigator.userAgent).getBrowserInfo();
    browserDetails.innerText =
      `${details.name} ${details.version} ${details.platform}`;
    errorBox.showModal();
  });

  // set version
  const displayDate = PROJECT_DATA.onDevelopment
    ? "(on development)"
    : `- Released ${new Date(PROJECT_DATA.releaseDate).toLocaleDateString()}`;

  versionDisplay.innerText = `${PROJECT_DATA.version} ${displayDate}`;

  // load settings
  loadFromLocalStorage();

  // states for storing previous dictionary states for discarding dictionary edits
  let lastSavedText = checkLocalStorage()
    ? localStorage.getItem(DICTIONARY_KEY) ?? ""
    : customDictionaryTextBox.value;
  let lastSavedDictionary = dictionaryParser.parse(lastSavedText);

  // this variable also holds error messages
  let currentDictionary = lastSavedDictionary;

  // load custom dictionary
  if (!currentDictionary.isError()) {
    loadCustomDictionary(currentDictionary.unwrap()[0]);
  } else {
    showDictionaryError();
    showMessage(DICTIONARY_LOADING_FAILED_MESSAGE);
  }

  // state for output
  let output: null | Generator<Result<string>> = null;
  let size = 0;

  // initial text area size
  resizeTextarea();
  function resizeTextarea() {
    inputTextBox.style.height = "auto";
    inputTextBox.style.height = `${inputTextBox.scrollHeight + 14}px`;
  }

  // initialize button label
  updateLabel();
  function updateLabel() {
    translateButton.innerText = settings.multiline
      ? TRANSLATE_LABEL_MULTILINE
      : TRANSLATE_LABEL;
  }

  // show custom dictionary errors
  function showDictionaryError() {
    customDictionaryErrorSummary.innerText =
      `Errors (${currentDictionary.errors.length}):`;
    customDictionaryErrorList.innerHTML = "";
    for (const error of currentDictionary.errors) {
      const list = document.createElement("li");
      list.innerText = error.message;
      const { position: { position, length } } = error as PositionedError & {
        position: { position: number; length: number };
      };
      list.addEventListener("click", () => {
        customDictionaryTextBox.focus();
        customDictionaryTextBox.setSelectionRange(
          position,
          position + length,
        );
      });
      customDictionaryErrorList.appendChild(list);
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
  loadMoreButton.addEventListener("click", moreOutput);
  function updateOutput() {
    outputList.innerHTML = "";
    errorList.innerHTML = "";
    errorDisplay.innerText = "";
    loadMoreButton.style.display = "";
    output = translate(inputTextBox.value).iterable();
    size = 0;
    moreOutput();
  }
  function moreOutput() {
    const errors: Array<ResultError> = [];
    let yielded = false;
    let i = 0;
    while (i < Math.min(INITIAL_PAGE_SIZE * 2 ** size, MAX_PAGE_SIZE)) {
      const next = output!.next();
      if (!next.done) {
        const { value: result } = next;
        switch (result.type) {
          case "value": {
            yielded = true;
            const list = document.createElement("li");
            list.innerHTML = result.value;
            outputList.appendChild(list);
            i++;
            break;
          }
          case "error":
            errors.push(result.error);
            break;
        }
      } else {
        loadMoreButton.style.display = "none";
        break;
      }
    }
    if (size < Math.log2(MAX_PAGE_SIZE / INITIAL_PAGE_SIZE)) {
      size++;
    }
    if (!yielded) {
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
        const property = item.isHtml ? "innerHTML" : "innerText";
        const list = document.createElement("li");
        list[property] = item.message;
        errorList.appendChild(list);
      }
    }
  }
  settingsButton.addEventListener("click", () => {
    settingsDialogBox.showModal();
  });
  confirmButton.addEventListener("click", () => {
    loadFromDom();
    updateLabel();
    settingsDialogBox.close();
  });
  cancelButton.addEventListener("click", () => {
    resetDomToCurrent();
    settingsDialogBox.close();
  });
  resetButton.addEventListener("click", resetDomToDefault);
  customDictionaryButton.addEventListener("click", () => {
    customDictionaryDialogBox.showModal();
    if (checkLocalStorage()) {
      customDictionaryTextBox.value = localStorage.getItem(DICTIONARY_KEY) ??
        DEFAULT_CUSTOM_DICTIONARY_MESSAGE;
    }
  });
  importWordButton.addEventListener("click", importWord);
  importWordTextBox.addEventListener("keydown", (event) => {
    if (event.code === "Enter" && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      importWord();
    }
  });
  function importWord() {
    const word = importWordTextBox.value.trim();
    if (
      autoParse() && !currentDictionary.isError() &&
      currentDictionary.unwrap()[0].has(word)
    ) {
      showMessage(WORD_ALREADY_IMPORTED_MESSAGE(word));
    } else {
      const definitions = dictionary.get(word)?.source;
      if (definitions != null) {
        const original = customDictionaryTextBox.value.trimEnd();
        const append = original === "" ? "" : "\n\n";
        customDictionaryTextBox.value =
          `${original}${append}${word}:${definitions}\n`;
        customDictionaryTextBox.scrollTo(
          0,
          customDictionaryTextBox.scrollHeight,
        );
        updateIfCanAutoParse();
      } else if (word === "") {
        showMessage(NO_WORD_MESSAGE);
      } else {
        showMessage(
          WORD_NOT_FOUND_MESSAGE(
            word,
            closestString(
              word,
              [...dictionary.keys()],
              { caseSensitive: true },
            ),
          ),
        );
      }
    }
  }
  customDictionaryTextBox.addEventListener("input", updateIfCanAutoParse);
  discardButton.addEventListener("click", () => {
    customDictionaryTextBox.value = lastSavedText;
    currentDictionary = lastSavedDictionary;
    tryCloseDictionary();
  });
  saveButton.addEventListener("click", () => {
    if (!autoParse()) {
      updateDictionary();
    }
    tryCloseDictionary();
  });
  function updateDictionary() {
    currentDictionary = dictionaryParser.parse(customDictionaryTextBox.value);
    showDictionaryError();
  }
  function updateIfCanAutoParse() {
    if (autoParse()) {
      updateDictionary();
    }
  }
  function tryCloseDictionary() {
    if (!currentDictionary.isError()) {
      lastSavedText = customDictionaryTextBox.value;
      lastSavedDictionary = currentDictionary;
      loadCustomDictionary(currentDictionary.unwrap()[0]);
      setIgnoreError(DICTIONARY_KEY, customDictionaryTextBox.value);
      customDictionaryDialogBox.close();
    } else {
      showMessage(DICTIONARY_ERROR_MESSAGE);
    }
  }
  closeButton.addEventListener("click", () => {
    alertBox.close();
  });
  errorCloseButton.addEventListener("click", () => {
    errorBox.close();
  });
  addEventListener("beforeunload", (event) => {
    if (customDictionaryDialogBox.open) {
      event.preventDefault();
    }
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
// remove unused local storage data
// TODO: when stable, remove this
const used = [DICTIONARY_KEY, ...Object.keys(settings)];
const unused = [...new Array(localStorage.length).keys()]
  .map((i) => localStorage.key(i)!)
  .filter((key) => !used.includes(key));
for (const key of unused) {
  localStorage.removeItem(key);
}
