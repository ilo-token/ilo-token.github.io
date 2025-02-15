import * as Dictionary from "../../dictionary/type.ts";
import { Output } from "../output.ts";
import { adjective, compoundAdjective } from "./adjective.ts";
import * as English from "./ast.ts";
import * as EnglishComposer from "./composer.ts";
import { nounAsPlainString, simpleNounForms } from "./noun.ts";
import { pronoun } from "./pronoun.ts";
import { fromVerbForms, partialVerb } from "./verb.ts";

export function definitionAsPlainString(
  definition: Dictionary.Definition,
): Output<string> {
  switch (definition.type) {
    case "noun":
      return nounAsPlainString(definition);
    case "personal pronoun":
      return Output.concat(
        pronoun(definition, 1, false, "subject"),
        pronoun(definition, 1, false, "object"),
      )
        .map((noun) => EnglishComposer.noun(noun, 0));
    case "adjective":
      return adjective(definition, null, 1)
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
      return new Output([definition.adverb]);
    case "interjection":
      return new Output([definition.interjection]);
    case "verb": {
      return Output.combine(
        fromVerbForms(definition, "third", "plural", false),
        partialVerb(definition, 1, false),
      )
        .map<English.VerbPhrase>(([verb, partialVerb]) => ({
          ...partialVerb,
          type: "default",
          verb,
          objectComplement: null,
          hideVerb: false,
        }))
        .map((verb) => EnglishComposer.verb(verb, 0));
    }
    case "filler":
      return new Output([
        `${definition.before}${definition.repeat}${definition.after}`,
      ]);
    case "particle definition":
      return new Output([definition.definition]);
    case "noun preposition":
      return nounAsPlainString(definition.noun)
        .map((noun) => `${noun} ${definition.preposition}`);
    case "numeral":
      return new Output([`${definition.numeral}`]);
    case "preposition":
      return new Output([definition.preposition]);
    case "modal verb":
      return new Output([definition.verb]);
  }
}
