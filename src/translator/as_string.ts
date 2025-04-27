import * as Dictionary from "../../dictionary/type.ts";
import { IterableResult } from "../compound.ts";
import { adjective, compoundAdjective } from "./adjective.ts";
import * as EnglishComposer from "./composer.ts";
import { nounAsPlainString, simpleNounForms } from "./noun.ts";
import { pronoun } from "./pronoun.ts";
import { partialVerb, verb } from "./verb.ts";

export function definitionAsPlainString(
  definition: Dictionary.Definition,
): IterableResult<string> {
  switch (definition.type) {
    case "noun":
      return nounAsPlainString(definition);
    case "personal pronoun":
      return IterableResult.concat(
        pronoun({
          definition,
          reduplicationCount: 1,
          emphasis: false,
          place: "subject",
        }),
        pronoun({
          definition,
          reduplicationCount: 1,
          emphasis: false,
          place: "object",
        }),
      )
        .map((noun) => EnglishComposer.noun(noun, 0));
    case "adjective":
      return adjective({ definition, reduplicationCount: 1, emphasis: null })
        .map((adjective) => EnglishComposer.adjective(adjective, 0));
    case "compound adjective": {
      return compoundAdjective({
        adjectives: definition.adjective,
        reduplicationCount: 1,
        emphasis: null,
      })
        .map((adjective) => EnglishComposer.adjective(adjective, 0));
    }
    case "determiner":
      return simpleNounForms({
        singular: definition.determiner,
        plural: definition.plural,
      });
    case "adverb":
      return IterableResult.single(definition.adverb);
    case "interjection":
      return IterableResult.single(definition.interjection);
    case "verb": {
      return partialVerb({ definition, reduplicationCount: 1, emphasis: false })
        .flatMap((partialVerb) =>
          verb({ ...partialVerb, type: "simple" }, "third", "plural")
        )
        .map((verb) => EnglishComposer.verb(verb, 0));
    }
    case "filler":
      return IterableResult.single(
        `${definition.before}${definition.repeat}${definition.after}`,
      );
    case "particle definition":
      return IterableResult.single(definition.definition);
    case "noun preposition":
      return nounAsPlainString(definition.noun)
        .map((noun) => `${noun} ${definition.preposition}`);
    case "numeral":
      return IterableResult.single(`${definition.numeral}`);
    case "preposition":
      return IterableResult.single(definition.preposition);
    case "modal verb":
      return IterableResult.single(definition.verb);
  }
}
