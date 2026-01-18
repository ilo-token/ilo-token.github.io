// this code is browser only

import { closestString } from "@std/text/closest-string";
import BrowserDetector from "browser-dtector";
import PROJECT_DATA from "../project_data.json" with { type: "json" };
import { extractResultError, Result, ResultError } from "./compound.ts";
import { dictionary, loadCustomDictionary } from "./dictionary/dictionary.ts";
import { parseDictionary } from "./dictionary/parser.ts";
import { Dictionary } from "./dictionary/type.ts";
import {
  assertQuotaExceededError,
  checkLocalStorage,
} from "./local_storage.ts";
import { hasXAlaX } from "./parser/lexer.ts";
import { Position, PositionedError } from "./parser/parser_lib.ts";
import { settings } from "./settings.ts";
import {
  loadFromDom,
  loadFromLocalStorage,
  resetDomToCurrent,
  resetDomToDefault,
} from "./settings_frontend.ts";
import { translate } from "./translator/translator.ts";

const DICTIONARY_AUTO_PARSE_THRESHOLD = 5000;
const INITIAL_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 25248;

// never change this
const DICTIONARY_KEY = "dictionary";

const TRANSLATE_LABEL = "Translate";
const TRANSLATE_LABEL_MULTILINE = "Translate (Ctrl + Enter)";

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
# words. Just know that the custom
# dictionary comes with limitations.
# Press Help above to get started.
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
const QUOTA_EXCEEDED_MESSAGE = "Browser storage quota exceeded due to the " +
  "length of your custom dictionary. It may not be saved properly.";

const X_ALA_X_WARNING = "ilo Token doesn't recognize X ala X";

function main() {
  // load DOM
  const inputTextBox = document.getElementById(
    "input",
  ) as HTMLTextAreaElement;

  const outputList = document.getElementById("output") as HTMLUListElement;
  const warning = document.getElementById(
    "warning",
  ) as HTMLParagraphElement;
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
  const displayDate = location.href.startsWith("https://ilo-token.github.io/")
    ? `- Released ${new Date(PROJECT_DATA.releaseDate).toLocaleDateString()}`
    : "(on development)";

  versionDisplay.innerText = `${PROJECT_DATA.version} ${displayDate}`;

  // load settings
  loadFromLocalStorage();

  // states for storing previous dictionary states for discarding dictionary edits
  let lastSavedText: string = customDictionaryTextBox.value;
  if (checkLocalStorage()) {
    const savedText = localStorage.getItem(DICTIONARY_KEY);
    if (savedText != null) {
      lastSavedText = savedText;
    }
  }

  let lastSavedDictionary: null | Dictionary = null;
  try {
    lastSavedDictionary = parseDictionary(lastSavedText);
  } catch (error) {
    showDictionaryError(extractResultError(error));
    showMessage(DICTIONARY_LOADING_FAILED_MESSAGE);
  }
  let currentDictionary = lastSavedDictionary;

  if (currentDictionary != null) {
    loadCustomDictionary(currentDictionary);
  }

  // state for output
  let output: null | Iterator<Result<string>> = null;
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
  function showDictionaryError(errors: ReadonlyArray<ResultError>) {
    customDictionaryErrorSummary.innerText = `Errors (${errors.length}):`;
    customDictionaryErrorList.innerHTML = "";
    for (const error of errors) {
      const listItem = document.createElement("li");
      customDictionaryErrorList.appendChild(listItem);

      if (error instanceof PositionedError && error.position != null) {
        const link = document.createElement("a");
        listItem.appendChild(link);

        link.href = "#";
        link.innerText = error.message;
        const { position: { position, length } } = error as PositionedError & {
          position: Position;
        };
        link.addEventListener("click", () => {
          customDictionaryTextBox.focus();
          customDictionaryTextBox.setSelectionRange(
            position,
            position + length,
          );
        });
      } else {
        listItem.innerText = error.message;
      }
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
    warning.innerHTML = "";
    errorList.innerHTML = "";
    errorDisplay.innerText = "";
    loadMoreButton.style.display = "";
    output = translate(inputTextBox.value)[Symbol.iterator]();
    if (hasXAlaX(inputTextBox.value)) {
      warning.innerText = `Warning: ${X_ALA_X_WARNING}`;
    }
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
          throw new Error(
            "no error information found when there should be some",
          );
        case 1:
          errorDisplay.innerText = SINGULAR_ERROR_MESSAGE;
          break;
        default:
          errorDisplay.innerText = MULTIPLE_ERROR_MESSAGE;
          break;
      }
      for (const item of errors) {
        const list = document.createElement("li");
        list.innerText = item.message;
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
      const savedText = localStorage.getItem(DICTIONARY_KEY);
      if (savedText != null) {
        customDictionaryTextBox.value = savedText;
      }
    }
    if (customDictionaryTextBox.value.trim() === "") {
      customDictionaryTextBox.value = DEFAULT_CUSTOM_DICTIONARY_MESSAGE;
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
      autoParse() && currentDictionary != null && currentDictionary.has(word)
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
    try {
      currentDictionary = parseDictionary(customDictionaryTextBox.value);
    } catch (error) {
      showDictionaryError(extractResultError(error));
    }
  }
  function updateIfCanAutoParse() {
    if (autoParse()) {
      updateDictionary();
    }
  }
  function tryCloseDictionary() {
    if (currentDictionary != null) {
      lastSavedText = customDictionaryTextBox.value;
      lastSavedDictionary = currentDictionary;
      loadCustomDictionary(currentDictionary);
      let exceeded = false;
      if (checkLocalStorage()) {
        try {
          localStorage.setItem(DICTIONARY_KEY, customDictionaryTextBox.value);
        } catch (error) {
          assertQuotaExceededError(error);
          exceeded = true;
          localStorage.removeItem(DICTIONARY_KEY);
        }
      }
      customDictionaryDialogBox.close();
      if (exceeded) {
        showMessage(QUOTA_EXCEEDED_MESSAGE);
      }
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
    if (
      customDictionaryDialogBox.open &&
      lastSavedText !== customDictionaryTextBox.value
    ) {
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
