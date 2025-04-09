import { dictionary as globalDictionary } from "../dictionary/dictionary.ts";
import { parseDictionary } from "../dictionary/parser.ts";
import { Definition, Dictionary } from "../dictionary/type.ts";
import { load } from "../telo_misikeke/telo_misikeke.js";

// All of these global constants are mutable

const customDictionary: Dictionary = new Map();
export const dictionary: Dictionary = new Map();

export const contentWordSet: Set<string> = new Set();
export const prepositionSet: Set<string> = new Set();
export const preverbSet: Set<string> = new Set();
export const fillerSet: Set<string> = new Set();
export const numeralSet: Set<string> = new Set();
export const tokiPonaWordSet: Set<string> = new Set();

update();

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
    ({ type }) =>
      type !== "filler" &&
      type !== "particle definition",
  );
  redefineSetWithType(prepositionSet, "preposition");
  redefineSet(
    preverbSet,
    (definition) =>
      (definition.type === "verb" && definition.predicateType != null) ||
      definition.type === "modal verb",
  );
  redefineSetWithType(fillerSet, "filler");
  redefineSetWithType(numeralSet, "numeral");
  redefineSet(tokiPonaWordSet, () => true);
  load([...words]);
}
function redefineSet(
  set: Set<string>,
  filter: (definition: Definition) => boolean,
): void {
  set.clear();
  for (const [word, { definitions }] of dictionary) {
    if (definitions.some(filter)) {
      set.add(word);
    }
  }
}
function redefineSetWithType(
  set: Set<string>,
  type: Definition["type"],
): void {
  redefineSet(set, ({ type: compareType }) => compareType === type);
}
