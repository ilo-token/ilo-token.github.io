import { UnreachableError } from "./error.ts";
import { translate } from "./translator.ts";

// Set to false when releasing, set to true when developing
const DEVELOPMENT = true;
// Don't forget these two when releasing
const DATE_RELEASED = new Date("2024-2-1");
const VERSION = "v0.2.3";

// TODO: maybe use worker
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("input") as HTMLTextAreaElement;
  const output = document.getElementById("output") as HTMLUListElement;
  const error = document.getElementById("error") as HTMLParagraphElement;
  const errorList = document.getElementById(
    "error-list",
  ) as HTMLParagraphElement;
  const button = document.getElementById(
    "translate-button",
  ) as HTMLButtonElement;
  const version = document.getElementById("version") as HTMLAnchorElement;
  if (DEVELOPMENT) {
    version.innerText = `${VERSION} (On development)`;
  } else {
    const date = DATE_RELEASED.toLocaleDateString(undefined, {
      dateStyle: "short",
    });
    version.innerText = `${VERSION} - Released ${date}`;
  }
  const listener = () => {
    while (output.children.length > 0) {
      output.removeChild(output.children[0]);
    }
    while (errorList.children.length > 0) {
      errorList.removeChild(errorList.children[0]);
    }
    error.innerText = "";
    try {
      const translations = translate(input.value);
      if (translations.isError()) {
        const errors = translations.errors;
        if (errors.length === 0) {
          error.innerText =
            "An unknown error has occurred (Errors should be known, please report this)";
        } else if (errors.length === 1) {
          error.innerText = errors[0].message;
        } else {
          error.innerText =
            "Multiple errors has been found, but only at least one could be helpful:";
          for (const errorMessage of errors) {
            const list = document.createElement("li");
            list.innerText = errorMessage.message;
            output.appendChild(list);
          }
        }
      } else {
        const set = new Set<string>();
        for (const translation of translations.output) {
          if (!set.has(translation)) {
            const list = document.createElement("li");
            list.innerText = translation;
            output.appendChild(list);
            set.add(translation);
          }
        }
      }
    } catch (unreachableError) {
      if (unreachableError instanceof Error) {
        error.innerText = unreachableError.message;
      } else {
        error.innerText = unreachableError.toString();
      }
      error.innerText += " (This is bad, please report this)";
      throw error;
    }
  };
  button.addEventListener("click", listener);
  input.addEventListener("keydown", (event) => {
    if (event.code === "Enter") {
      listener();
      event.preventDefault();
    }
  });
});
