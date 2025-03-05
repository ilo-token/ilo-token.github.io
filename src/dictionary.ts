import { dictionary as globalDictionary } from "../dictionary/dictionary.ts";
import { parseDictionary } from "../dictionary/parser.ts";
import { Definition, Dictionary } from "../dictionary/type.ts";
import { ArrayResultError } from "./array_result.ts";

const customDictionary: Dictionary = new Map();
export const dictionary: Dictionary = new Map();

export const contentWordSet: Set<string> = new Set();
export const prepositionSet: Set<string> = new Set();
export const preverbSet: Set<string> = new Set();
export const fillerSet: Set<string> = new Set();
export const numeralSet: Set<string> = new Set();
export const tokiPonaWordSet: Set<string> = new Set();

update();

export class MissingEntryError extends ArrayResultError {
  constructor(kind: string, word: string) {
    super(`${kind} definition for the word "${word}" is missing`);
    this.name = "MissingEntryError";
  }
}
export function loadCustomDictionary(dictionaryText: string): void {
  const dictionary = parseDictionary(dictionaryText);
  customDictionary.clear();
  for (const [key, value] of dictionary) {
    customDictionary.set(key, value);
  }
  update();
}
function update(): void {
  dictionary.clear();
  const words = new Set([
    ...globalDictionary.keys(),
    ...customDictionary.keys(),
  ]);
  for (const word of words) {
    const entry = customDictionary.get(word) ?? globalDictionary.get(word)!;
    if (entry.definitions.length > 0) {
      dictionary.set(word, entry);
    }
  }
  redefineSet(
    contentWordSet,
    (definition) =>
      definition.type !== "filler" &&
      definition.type !== "particle definition",
  );
  redefineSet(
    prepositionSet,
    (definition) => definition.type === "preposition",
  );
  redefineSet(
    preverbSet,
    (definition) =>
      (definition.type === "verb" && definition.predicateType != null) ||
      definition.type === "modal verb",
  );
  redefineSet(fillerSet, (definition) => definition.type === "filler");
  redefineSet(numeralSet, (definition) => definition.type === "numeral");
  redefineSet(tokiPonaWordSet, () => true);
}
function redefineSet(
  set: Set<string>,
  filter: (definition: Definition) => boolean,
): void {
  set.clear();
  for (const [word, entry] of dictionary) {
    if (entry.definitions.some(filter)) {
      set.add(word);
    }
  }
}
