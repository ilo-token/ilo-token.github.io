import { ResultError, TodoError } from "../compound.ts";

export class TranslationTodoError extends TodoError {
  override name = "TranslationTodoError";
  constructor(type: string) {
    super(`translation of ${type}`);
  }
}
export class ExhaustedError extends ResultError {
  override name = "ExhaustedError";
  constructor(text: string) {
    super(`no possible translation found for "${text}"`);
  }
}
export class FilteredError extends ResultError {
  override name = "FilteredOutError";
  constructor(element: string) {
    super(`${element} is filtered out`);
  }
}
export class UntranslatableError extends ResultError {
  override name = "UntranslatableError";
  constructor(source: string, target: string) {
    super(`cannot translate ${source} into ${target}`);
  }
}
