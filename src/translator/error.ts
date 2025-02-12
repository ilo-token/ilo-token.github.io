import { OutputError, TodoError } from "../output.ts";

export class TranslationTodoError extends TodoError {
  constructor(kind: string) {
    super(`translation of ${kind}`);
    this.name = "TranslationTodoError";
  }
}
export class ExhaustedError extends OutputError {
  constructor(text: string) {
    super(`no possible translation found for "${text}"`);
    this.name = "ExhaustedError";
  }
}
