import * as Dictionary from "../../dictionary/type.ts";
import { ArrayResult } from "../array_result.ts";
import { adjective, compoundAdjective } from "./adjective.ts";
import * as EnglishComposer from "./composer.ts";
import { nounAsPlainString, simpleNounForms } from "./noun.ts";
import { pronoun } from "./pronoun.ts";
import { partialVerb, verb } from "./verb.ts";

export function definitionAsPlainString(
  definition: Dictionary.Definition,
): ArrayResult<string> {
  switch (definition.type) {
    case "noun":
      return nounAsPlainString(definition);
    case "personal pronoun":
      return ArrayResult.concat(
        pronoun(definition, 1, false, "subject"),
        pronoun(definition, 1, false, "object"),
      )
        .map((noun) => EnglishComposer.noun(noun, 0));
    case "adjective":
      return adjective(definition, 1, null)
        .map((adjective) => EnglishComposer.adjective(adjective, 0));
    case "compound adjective": {
      return compoundAdjective(definition.adjective, 1, null)
        .map((adjective) => EnglishComposer.adjective(adjective, 0));
    }
    case "determiner":
      return simpleNounForms({
        singular: definition.determiner,
        plural: definition.plural,
      });
    case "adverb":
      return new ArrayResult([definition.adverb]);
    case "interjection":
      return new ArrayResult([definition.interjection]);
    case "verb": {
      return partialVerb(definition, 1, false)
        .flatMap((partialVerb) =>
          verb({ ...partialVerb, type: "simple" }, "third", "plural")
        )
        .map((verb) => EnglishComposer.verb(verb, 0));
    }
    case "filler":
      return new ArrayResult([
        `${definition.before}${definition.repeat}${definition.after}`,
      ]);
    case "particle definition":
      return new ArrayResult([definition.definition]);
    case "noun preposition":
      return nounAsPlainString(definition.noun)
        .map((noun) => `${noun} ${definition.preposition}`);
    case "numeral":
      return new ArrayResult([`${definition.numeral}`]);
    case "preposition":
      return new ArrayResult([definition.preposition]);
    case "modal verb":
      return new ArrayResult([definition.verb]);
  }
}
