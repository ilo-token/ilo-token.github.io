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
export class FilteredOutError extends OutputError {
  constructor(element: string) {
    super(`${element} is filtered out`);
    this.name = "FilteredOutError";
  }
}
export class UntranslatableError extends OutputError {
  constructor(source: string, target: string) {
    super(`cannot translate ${source} into ${target}`);
    this.name = "UntranslatableError";
  }
}
