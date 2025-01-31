import { parseDictionary } from "../dictionary/parser.ts";
import { Definition, Dictionary } from "../dictionary/type.ts";
import { OutputError } from "./output.ts";
import { dictionary as globalDictionary } from "../dictionary/dictionary.ts";

let customDictionary: Dictionary = {};
let dictionary: Dictionary = {};

let contentWordSet: Set<string> = new Set();
let prepositionSet: Set<string> = new Set();
let preverbSet: Set<string> = new Set();
let tokiPonaWordSet: Set<string> = new Set();

export function getDictionary(): Dictionary {
  return dictionary;
}
export function getContentWordSet(): Set<string> {
  return contentWordSet;
}
export function getPrepositionSet(): Set<string> {
  return prepositionSet;
}
export function getPreverbSet(): Set<string> {
  return preverbSet;
}
export function getTokiPonaWordSet(): Set<string> {
  return tokiPonaWordSet;
}
function wordSet(
  filter: (definition: Definition) => boolean,
): Set<string> {
  return new Set(
    Object
      .entries(dictionary)
      .filter(([_, entry]) => entry.definitions.some(filter))
      .map(([word]) => word),
  );
}
function wordSetWithType(types: Array<Definition["type"]>): Set<string> {
  return wordSet((definition) => types.includes(definition.type));
}
export function loadCustomDictionary(
  dictionaryText: string,
): Array<OutputError> {
  const output = parseDictionary(dictionaryText).deduplicateErrors();
  let errors: Array<OutputError>;
  if (output.isError()) {
    customDictionary = {};
    errors = output.errors;
  } else {
    customDictionary = output.output[0];
    errors = [];
  }
  update();
  return errors;
}
function update(): void {
  dictionary = {};
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
  contentWordSet = wordSet((definition) =>
    definition.type !== "filler" &&
    definition.type !== "particle definition"
  );
  prepositionSet = wordSetWithType(["preposition"]);
  preverbSet = wordSetWithType([
    "preverb as finite verb",
    "preverb as linking verb",
    "preverb as modal verb",
  ]);
  tokiPonaWordSet = new Set(Object.keys(dictionary));
}
update();
