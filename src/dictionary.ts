import { dictionary as globalDictionary } from "../dictionary/dictionary.ts";
import { parseDictionary } from "../dictionary/parser.ts";
import { Definition, Dictionary } from "../dictionary/type.ts";
import { ArrayResultError } from "./array-result.ts";

const customDictionary: Dictionary = new Map();
export const dictionary: Dictionary = new Map();

export const contentWordSet: Set<string> = new Set();
export const prepositionSet: Set<string> = new Set();
export const preverbSet: Set<string> = new Set();
export const tokiPonaWordSet: Set<string> = new Set();

update();

/** Represents Error due to missing dictionary entry */
export class MissingEntryError extends ArrayResultError {
  constructor(kind: string, word: string) {
    super(`${kind} definition for the word "${word}" is missing`);
    this.name = "MissingEntryError";
  }
}
/** Updates custom dictionary. */
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
  for (
    const word of new Set([
      ...globalDictionary.keys(),
      ...customDictionary.keys(),
    ])
  ) {
    const entry = customDictionary.get(word) ?? globalDictionary.get(word)!;
    if (entry.definitions.length > 0) {
      dictionary.set(word, entry);
    }
  }
  for (
    const set of [contentWordSet, prepositionSet, preverbSet, tokiPonaWordSet]
  ) {
    set.clear();
  }
  addSet(
    contentWordSet,
    (definition) =>
      definition.type !== "filler" &&
      definition.type !== "particle definition",
  );
  addSet(prepositionSet, (definition) => definition.type === "preposition");
  addSet(
    preverbSet,
    (definition) =>
      (definition.type === "verb" && definition.predicateType != null) ||
      definition.type === "modal verb",
  );
  addSet(tokiPonaWordSet, () => true);
}
function addSet(
  set: Set<string>,
  filter: (definition: Definition) => boolean,
): void {
  const array = Object
    .entries(dictionary)
    .filter(([_, entry]) => entry.definitions.some(filter))
    .map(([word]) => word);
  for (const word of array) {
    set.add(word);
  }
}
