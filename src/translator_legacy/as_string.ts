import { IterableResult } from "../compound.ts";
import * as Dictionary from "../dictionary/type.ts";
import { adjective, compoundAdjective } from "./adjective.ts";
import * as EnglishComposer from "../resolver_and_composer/composer.ts";
import { noun, simpleNounForms } from "./noun.ts";
import { pronoun } from "./pronoun.ts";
import { partialSimpleVerb, verb } from "./verb.ts";

function nounAsPlainString(definition: Dictionary.Noun) {
  return noun({ definition, reduplicationCount: 1, emphasis: false })
    .map((noun) => EnglishComposer.noun(noun, 0));
}
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
        adjectives: definition.adjectives,
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
      return partialSimpleVerb({
        definition,
        reduplicationCount: 1,
        emphasis: false,
      })
        .flatMap((partialSimpleVerb) =>
          verb({ ...partialSimpleVerb, type: "simple" }, "third", "plural")
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
