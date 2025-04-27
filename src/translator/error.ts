import { ArrayResultError, TodoError } from "../array_result.ts";

export class TranslationTodoError extends TodoError {
  override name = "TranslationTodoError";
  constructor(type: string) {
    super(`translation of ${type}`);
  }
}
export class ExhaustedError extends ArrayResultError {
  override name = "ExhaustedError";
  constructor(text: string) {
    super(`no possible translation found for "${text}"`);
  }
}
export class FilteredError extends ArrayResultError {
  override name = "FilteredOutError";
  constructor(element: string) {
    super(`${element} is filtered out`);
  }
}
export class UntranslatableError extends ArrayResultError {
  override name = "UntranslatableError";
  constructor(source: string, target: string) {
    super(`cannot translate ${source} into ${target}`);
  }
}
