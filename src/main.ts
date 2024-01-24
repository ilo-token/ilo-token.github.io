import { translate } from "./translator.ts";

// TODO: maybe use worker
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("input") as HTMLTextAreaElement;
  const output = document.getElementById("output") as HTMLUListElement;
  const error = document.getElementById("error") as HTMLParagraphElement;
  const button = document.getElementById(
    "translate-button",
  ) as HTMLButtonElement;
  const listener = () => {
    while (output.children.length > 0) {
      output.removeChild(output.children[0]);
    }
    error.innerText = "";
    const translations = translate(input.value);
    if (translations.isError()) {
      error.innerText = translations.error?.message ?? "No error provided";
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
  };
  button.addEventListener("click", listener);
  input.addEventListener("keydown", (event) => {
    if (event.code === "Enter") {
      listener();
      event.preventDefault();
    }
  });
});
