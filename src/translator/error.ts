import { ResultError, TodoError } from "../compound.ts";
import { ErrorOption } from "../misc/misc.ts";

export class TranslationTodoError extends TodoError {
  override name = "TranslationTodoError";
  constructor(type: string, option?: ErrorOption) {
    super(`translation of ${type}`, option);
  }
}
export class ExhaustedError extends ResultError {
  override name = "ExhaustedError";
  constructor(text: string, option?: ErrorOption) {
    super(`no possible translation found for "${text}"`, option);
  }
}
export class FilteredError extends ResultError {
  override name = "FilteredOutError";
  constructor(element: string, option?: ErrorOption) {
    super(`${element} is filtered out`, option);
  }
}
export class UntranslatableError extends ResultError {
  override name = "UntranslatableError";
  constructor(source: string, target: string, option?: ErrorOption) {
    super(`cannot translate ${source} into ${target}`, option);
  }
}
