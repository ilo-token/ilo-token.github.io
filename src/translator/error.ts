import { ArrayResultError, TodoError } from "../array_result.ts";

export class TranslationTodoError extends TodoError {
  constructor(type: string) {
    super(`translation of ${type}`);
    this.name = "TranslationTodoError";
  }
}
export class ExhaustedError extends ArrayResultError {
  constructor(text: string) {
    super(`no possible translation found for "${text}"`);
    this.name = "ExhaustedError";
  }
}
export class FilteredOutError extends ArrayResultError {
  constructor(element: string) {
    super(`${element} is filtered out`);
    this.name = "FilteredOutError";
  }
}
export class UntranslatableError extends ArrayResultError {
  constructor(source: string, target: string) {
    super(`cannot translate ${source} into ${target}`);
    this.name = "UntranslatableError";
  }
}
