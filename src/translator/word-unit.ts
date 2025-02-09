import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { Output, OutputError, TodoError } from "../output.ts";
import { dictionary } from "../dictionary.ts";
import { determiner } from "./determiner.ts";
import { adjective, compoundAdjective } from "./adjective.ts";

type WordUnitTranslation =
  | {
    type: "noun";
    determiner: Array<English.Determiner>;
    adjective: Array<English.AdjectivePhrase>;
    singular: null | string;
    plural: null | string;
    postAdjective: null | { adjective: string; name: string };
  }
  | {
    type: "adjective";
    adjective: English.AdjectivePhrase;
  };
function numberWordUnit(word: number): Output<WordUnitTranslation> {
  return new Output<WordUnitTranslation>([{
    type: "noun",
    determiner: [],
    adjective: [],
    singular: `${word}`,
    plural: null,
    postAdjective: null,
  }]);
}
export function wordUnit(
  wordUnit: TokiPona.WordUnit,
  place: "subject" | "object",
): Output<WordUnitTranslation> {
  switch (wordUnit.type) {
    case "number":
      return numberWordUnit(wordUnit.number);
    case "x ala x":
      return new Output(new TodoError("translation of x ala x"));
    case "default":
    case "reduplication": {
      let count: number;
      switch (wordUnit.type) {
        case "default":
          count = 1;
          break;
        case "reduplication":
          count = wordUnit.count;
          break;
      }
      return new Output(dictionary[wordUnit.word].definitions)
        .flatMap((definition) => {
          switch (definition.type) {
            case "noun": {
              const engDeterminer = Output
                .combine(...definition.determiner
                  .map((definition) => determiner(definition, false, 1)));
              const engAdjective = Output
                .combine(...definition.adjective
                  .map((definition) => adjective(definition, null, 1)));
              return Output.combine(engDeterminer, engAdjective)
                .map<WordUnitTranslation>(([determiner, adjective]) => ({
                  type: "noun",
                  determiner,
                  adjective,
                  singular: definition.singular,
                  plural: definition.plural,
                  postAdjective: definition.postAdjective,
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
                postAdjective: null,
              }]);
            }
            case "adjective":
              return adjective(definition, wordUnit.emphasis, count)
                .map<WordUnitTranslation>((adjective) => ({
                  type: "adjective",
                  adjective,
                }));
            case "compound adjective":
              if (wordUnit.type === "default") {
                return compoundAdjective(definition, wordUnit.emphasis)
                  .map<WordUnitTranslation>((adjective) => ({
                    type: "adjective",
                    adjective,
                  }));
              } else {
                throw new OutputError(
                  "cannot translate reduplication into compound adjective",
                );
              }
            default:
              return new Output();
          }
        });
    }
  }
}
