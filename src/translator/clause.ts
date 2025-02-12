import { nullableAsArray } from "../misc.ts";
import { Output } from "../output.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { TranslationTodoError } from "./error.ts";
import { multiplePhrases } from "./phrase.ts";

function phraseClause(
  phrases: TokiPona.MultiplePhrases,
): Output<English.Clause> {
  return multiplePhrases(phrases, "object", "en")
    .map<English.Clause>(
      (phrase) => {
        switch (phrase.type) {
          case "noun":
            return {
              type: "subject phrase",
              subject: phrase.noun,
            };
          case "adjective":
            return {
              type: "implied it's",
              verb: {
                type: "linking adjective",
                linkingVerb: {
                  word: "is",
                  emphasis: false,
                },
                adjective: phrase.adjective,
                preposition: nullableAsArray(phrase.inWayPhrase)
                  .map((object) => ({
                    preposition: { word: "in", emphasis: false },
                    object,
                  })),
              },
              preposition: [],
            };
        }
      },
    );
}
export function clause(clause: TokiPona.Clause): Output<English.Clause> {
  switch (clause.type) {
    case "phrases":
      return phraseClause(clause.phrases);
    case "o vocative":
      return multiplePhrases(clause.phrases, "object", "en")
        .filterMap((phrase) => {
          if (phrase.type === "noun") {
            return { type: "vocative", call: "hey", addressee: phrase.noun };
          } else {
            return null;
          }
        });
    case "prepositions":
    case "li clause":
    case "o clause":
    case "quotation":
      return new Output(new TranslationTodoError(clause.type));
  }
}
