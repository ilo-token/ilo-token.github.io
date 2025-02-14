import { dictionary } from "../dictionary.ts";
import { Output } from "../output.ts";
import * as TokiPona from "../parser/ast.ts";
import { adjective, compoundAdjective } from "./adjective.ts";
import * as English from "./ast.ts";
import { determiner } from "./determiner.ts";
import { TranslationTodoError, UntranslatableError } from "./error.ts";

export type WordUnitTranslation =
  | {
    type: "noun";
    determiner: Array<English.Determiner>;
    adjective: Array<English.AdjectivePhrase>;
    singular: null | string;
    plural: null | string;
    emphasis: boolean;
    reduplicationCount: number;
    postAdjective: null | { adjective: string; name: string };
  }
  | { type: "adjective"; adjective: English.AdjectivePhrase }
  | { type: "verb"; verb: English.VerbPhrase };
function numberWordUnit(
  word: number,
  emphasis: boolean,
): Output<WordUnitTranslation> {
  return new Output<WordUnitTranslation>([{
    type: "noun",
    determiner: [],
    adjective: [],
    singular: `${word}`,
    plural: null,
    emphasis,
    reduplicationCount: 1,
    postAdjective: null,
  }]);
}
function defaultWordUnit(
  word: string,
  reduplicationCount: number,
  emphasis: null | TokiPona.Emphasis,
  place: "subject" | "object",
): Output<WordUnitTranslation> {
  return new Output(dictionary[word].definitions)
    .flatMap((definition) => {
      switch (definition.type) {
        case "noun": {
          const engDeterminer = Output.combine(
            ...definition.determiner
              .map((definition) => determiner(definition, false, 1)),
          );
          const engAdjective = Output.combine(
            ...definition.adjective
              .map((definition) => adjective(definition, null, 1)),
          );
          return Output.combine(engDeterminer, engAdjective)
            .map<WordUnitTranslation>(([determiner, adjective]) => ({
              type: "noun",
              determiner,
              adjective,
              singular: definition.singular,
              plural: definition.plural,
              reduplicationCount,
              postAdjective: definition.postAdjective,
              emphasis: emphasis != null,
            }));
        }
        case "personal pronoun": {
          let singular: null | string;
          let plural: null | string;
          switch (place) {
            case "subject":
              singular = definition.singular?.subject ?? null;
              plural = definition.plural?.subject ?? null;
              break;
            case "object":
              singular = definition.singular?.object ?? null;
              plural = definition.plural?.object ?? null;
              break;
          }
          return new Output<WordUnitTranslation>([{
            type: "noun",
            determiner: [],
            adjective: [],
            singular,
            plural,
            reduplicationCount,
            postAdjective: null,
            emphasis: emphasis != null,
          }]);
        }
        case "adjective":
          return adjective(
            definition,
            emphasis,
            reduplicationCount,
          )
            .map<WordUnitTranslation>((adjective) => ({
              type: "adjective",
              adjective,
            }));
        case "compound adjective":
          if (reduplicationCount === 1) {
            return compoundAdjective(definition, emphasis)
              .map<WordUnitTranslation>((adjective) => ({
                type: "adjective",
                adjective,
              }));
          } else {
            throw new UntranslatableError(
              "reduplication",
              "compound adjective",
            );
          }
        default:
          return new Output();
      }
    });
}
export function wordUnit(
  wordUnit: TokiPona.WordUnit,
  place: "subject" | "object",
): Output<WordUnitTranslation> {
  switch (wordUnit.type) {
    case "number":
      return numberWordUnit(wordUnit.number, wordUnit.emphasis != null);
    case "x ala x":
      return new Output(new TranslationTodoError("x ala x"));
    case "default":
    case "reduplication": {
      let reduplicationCount: number;
      switch (wordUnit.type) {
        case "default":
          reduplicationCount = 1;
          break;
        case "reduplication":
          reduplicationCount = wordUnit.count;
          break;
      }
      return defaultWordUnit(
        wordUnit.word,
        reduplicationCount,
        wordUnit.emphasis,
        place,
      );
    }
  }
}
