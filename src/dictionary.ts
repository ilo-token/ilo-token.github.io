import { parseDictionary } from "../dictionary/parser.ts";
import { Dictionary } from "../dictionary/type.ts";
import { OutputError } from "./output.ts";
import { dictionary as defaultDictionary } from "../dictionary/dictionary.ts";

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
export function loadCustomDictionary(
  dictionaryText: string,
): Array<OutputError> {
  const output = parseDictionary(dictionaryText).deduplicateErrors();
  if (output.isError()) {
    customDictionary = {};
    update();
    return output.errors;
  } else {
    customDictionary = output.output[0];
    update();
    return [];
  }
}
function update(): void {
  dictionary = {};
  for (
    const word of new Set([
      ...Object.keys(defaultDictionary),
      ...Object.keys(customDictionary),
    ])
  ) {
    const entry = customDictionary[word] ?? defaultDictionary[word];
    if (entry.definitions.length > 0) {
      dictionary[word] = entry;
    }
  }
  contentWordSet = new Set(
    Object
      .entries(dictionary)
      .filter(([_, entry]) =>
        entry
          .definitions
          .some((definition) =>
            definition.type !== "filler" &&
            definition.type !== "particle definition"
          )
      )
      .map(([word]) => word),
  );
  prepositionSet = new Set(
    Object
      .entries(dictionary)
      .filter(([_, entry]) =>
        entry
          .definitions
          .some((definition) => definition.type === "preposition")
      )
      .map(([word]) => word),
  );
  preverbSet = new Set(
    Object
      .entries(dictionary)
      .filter(([_, entry]) =>
        entry
          .definitions
          .some((definition) =>
            definition.type === "preverb as finite verb" ||
            definition.type === "preverb as linking verb" ||
            definition.type === "preverb as modal verb"
          )
      )
      .map(([word]) => word),
  );
  tokiPonaWordSet = new Set(Object.keys(dictionary));
}
update();
