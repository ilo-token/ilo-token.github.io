import * as Dictionary from "../../dictionary/type.ts";
import { nullableAsArray } from "../misc.ts";
import { Output } from "../output.ts";
import { settings } from "../settings.ts";
import { adjective, compoundAdjective } from "./adjective.ts";
import * as Composer from "./composer.ts";
import { noun, simpleNounForms } from "./noun.ts";
import { pronoun } from "./pronoun.ts";
import { condenseVerb } from "./verb.ts";

function nounAsPlainString(definition: Dictionary.Noun): Output<string> {
  return noun(definition, 1, false).map((noun) => Composer.noun(noun, 0));
}
// TODO: use verb composer instead
function verbAsPlainString(verb: Dictionary.VerbForms): Output<string> {
  switch (settings.tense) {
    case "both":
      return new Output([
        verb.past,
        verb.presentPlural,
        `will ${verb.presentPlural}`,
      ]);
    case "condensed":
      return new Output([
        `(will) ${condenseVerb(verb.presentPlural, verb.past)}`,
      ]);
    case "default only":
      return new Output([verb.presentPlural]);
  }
}
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
        .map((noun) => Composer.noun(noun, 0));
    case "adjective":
      return adjective(definition, null, 1)
        .map((adjective) => Composer.adjective(adjective, 0));
    case "compound adjective": {
      return compoundAdjective(definition.adjective, 1, null)
        .map((adjective) => Composer.adjective(adjective, 0));
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
      const verbs = verbAsPlainString(definition);
      const directObject = Output.combine(
        ...nullableAsArray(definition.directObject)
          .map(nounAsPlainString),
      );
      const indirectObject = Output.combine(
        ...definition.indirectObject
          .map((object) =>
            nounAsPlainString(object.object)
              .map((noun) => `${object.preposition} ${noun}`)
          ),
      );
      return Output.combine(verbs, directObject, indirectObject)
        .map(([verb, directObject, indirectObject]) =>
          [
            verb,
            ...directObject,
            ...indirectObject,
          ]
            .join(" ")
        );
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
