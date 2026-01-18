import { dictionary as globalDictionary } from "./dictionary/dictionary.ts";
import { Definition, Dictionary } from "./dictionary/type.ts";

// all of these global constants are mutable

const customDictionary: Dictionary = new Map();
export const dictionary: Dictionary = new Map();

export const contentWordSet: Set<string> = new Set();
export const prepositionSet: Set<string> = new Set();
export const preverbSet: Set<string> = new Set();
export const fillerSet: Set<string> = new Set();
export const numeralSet: Set<string> = new Set();
export const tokiPonaWordSet: Set<string> = new Set();

update();

export function loadCustomDictionary(dictionary: Dictionary): void {
  customDictionary.clear();
  for (const [key, value] of dictionary) {
    customDictionary.set(key, value);
  }
  update();
}
function update() {
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
    ({ type }) => !["filler", "particle definition"].includes(type),
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
}
function redefineSet(
  set: Set<string>,
  filter: (definition: Definition) => boolean,
) {
  set.clear();
  for (const [word, { definitions }] of dictionary) {
    if (definitions.some(filter)) {
      set.add(word);
    }
  }
}
function redefineSetWithType(set: Set<string>, type: Definition["type"]) {
  redefineSet(set, ({ type: compareType }) => compareType === type);
}
