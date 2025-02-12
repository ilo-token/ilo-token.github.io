import { OutputError, TodoError } from "../output.ts";

export class TranslationTodoError extends TodoError {
  constructor(type: string) {
    super(`translation of ${type}`);
    this.name = "TranslationTodoError";
  }
}
export class ExhaustedError extends OutputError {
  constructor(text: string) {
    super(`no possible translation found for "${text}"`);
    this.name = "ExhaustedError";
  }
}
