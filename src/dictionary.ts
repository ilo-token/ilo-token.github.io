import { parseDictionary } from "../dictionary/parser.ts";
import { Definition, Dictionary } from "../dictionary/type.ts";
import { OutputError } from "./output.ts";
import { dictionary as globalDictionary } from "../dictionary/dictionary.ts";

const customDictionary: Dictionary = {};
export const dictionary: Dictionary = {};

export const contentWordSet: Set<string> = new Set();
export const prepositionSet: Set<string> = new Set();
export const preverbSet: Set<string> = new Set();
export const tokiPonaWordSet: Set<string> = new Set();

export function loadCustomDictionary(
  dictionaryText: string,
): Array<OutputError> {
  const output = parseDictionary(dictionaryText).deduplicateErrors();
  let errors: Array<OutputError>;
  for (const key of Object.keys(customDictionary)) {
    delete customDictionary[key];
  }
  if (output.isError()) {
    errors = output.errors;
  } else {
    for (const [key, value] of Object.entries(output.output[0])) {
      customDictionary[key] = value;
    }
    errors = [];
  }
  update();
  return errors;
}
function update(): void {
  for (const key of Object.keys(dictionary)) {
    delete dictionary[key];
  }
  for (
    const word of new Set([
      ...Object.keys(globalDictionary),
      ...Object.keys(customDictionary),
    ])
  ) {
    const entry = customDictionary[word] ?? globalDictionary[word];
    if (entry.definitions.length > 0) {
      dictionary[word] = entry;
    }
  }
  for (
    const set of [contentWordSet, prepositionSet, preverbSet, tokiPonaWordSet]
  ) {
    set.clear();
  }
  addSet(contentWordSet, (definition) =>
    definition.type !== "filler" &&
    definition.type !== "particle definition");
  addSet(
    prepositionSet,
    (definition) => definition.type === "preposition",
  );
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
update();
