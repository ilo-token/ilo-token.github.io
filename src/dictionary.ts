import { parseDictionary } from "./dictionary-parser.ts";
import { Dictionary } from "./dictionary-type.ts";
import { OutputError } from "./output.ts";

let defaultDictionary: Dictionary = {};
let customDictionary: Dictionary = {};
export let dictionary: Dictionary = {};

export let contentWordSet: Set<string> = new Set();
export let prepositionSet: Set<string> = new Set();
export let preverbSet: Set<string> = new Set();
export let tokiPonaWordSet: Set<string> = new Set();

export function loadDictionary(dictionaryText: string): void {
  const output = parseDictionary(dictionaryText);
  if (output.isError()) {
    throw new AggregateError(output.errors);
  } else {
    defaultDictionary = output.output[0];
  }
  update();
}
export function loadCustomDictionary(
  dictionaryText: string,
): Array<OutputError> {
  const output = parseDictionary(dictionaryText);
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
    dictionary[word] = customDictionary[word] ?? defaultDictionary[word];
  }
  contentWordSet = new Set(
    Object
      .entries(dictionary)
      .filter(([_, definitions]) =>
        definitions
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
      .filter(([_, definitions]) =>
        definitions.some((definition) => definition.type === "preposition")
      )
      .map(([word]) => word),
  );
  preverbSet = new Set(
    Object
      .entries(dictionary)
      .filter(([_, definitions]) =>
        definitions.some((definition) =>
          definition.type === "preverb as finite verb" ||
          definition.type === "preverb as linking verb" ||
          definition.type === "preverb as modal verb"
        )
      )
      .map(([word]) => word),
  );
  tokiPonaWordSet = new Set(Object.keys(dictionary));
}
