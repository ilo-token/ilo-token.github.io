import * as Dictionary from "../../dictionary/type.ts";
import { nullableAsArray } from "../misc.ts";
import { Output } from "../output.ts";
import { settings } from "../settings.ts";
import { simpleNounForms } from "./noun.ts";
import { condenseVerb } from "./verb.ts";

function nounAsPlainString(definition: Dictionary.Noun): Output<string> {
  return simpleNounForms(definition.singular, definition.plural)
    .map((noun) =>
      [
        ...definition.determiner.map((determiner) => determiner.determiner),
        ...definition.adjective.map((adjective) => adjective.adjective),
        noun,
        ...nullableAsArray(definition.postAdjective)
          .map((adjective) => `${adjective.adjective} ${adjective.name}`),
      ]
        .join(" ")
    );
}
function verbAsPlainString(
  verb: { presentPlural: string; past: string },
): Output<string> {
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
      return new Output([
        ...nullableAsArray(definition.singular?.subject),
        ...nullableAsArray(definition.singular?.object),
        ...nullableAsArray(definition.plural?.subject),
        ...nullableAsArray(definition.plural?.object),
      ]);
    case "adjective":
      return new Output([
        [...definition.adverb, definition.adjective].join(" "),
      ]);
    case "compound adjective": {
      const { adjective } = definition;
      if (adjective.length === 2) {
        return new Output([
          adjective
            .map((adjective) => adjective.adjective)
            .join(" and "),
        ]);
      } else {
        const lastIndex = adjective.length - 1;
        const init = adjective.slice(0, lastIndex);
        const last = adjective[lastIndex];
        return new Output([
          `${
            init.map((adjective) => adjective.adjective).join(", ")
          }, and ${last.adjective}`,
        ]);
      }
    }
    case "determiner":
      return simpleNounForms(definition.determiner, definition.plural);
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
