import { nullableAsArray } from "../misc.ts";
import { Output } from "../output.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { FilteredOutError, TranslationTodoError } from "./error.ts";
import { multiplePhrases } from "./phrase.ts";
import { unemphasized } from "./word.ts";

function phraseClause(
  phrases: TokiPona.MultiplePhrases,
): Output<English.Clause> {
  return multiplePhrases(phrases, "object", null, "en")
    .filterMap<English.Clause | null>(
      (phrase) => {
        switch (phrase.type) {
          case "noun":
            return {
              type: "subject phrase",
              subject: phrase.noun,
            };
          case "adjective":
            return {
              type: "default",
              subject: {
                type: "simple",
                determiner: [],
                adjective: [],
                noun: {
                  word: "it",
                  emphasis: false,
                },
                quantity: "singular",
                postAdjective: null,
                preposition: [],
                emphasis: false,
              },
              verb: {
                type: "linking",
                linkingVerb: {
                  word: "is",
                  emphasis: false,
                },
                subjectComplement: {
                  type: "adjective",
                  adjective: phrase.adjective,
                },
                preposition: nullableAsArray(phrase.inWayPhrase)
                  .map((object) => ({
                    preposition: unemphasized("in"),
                    object,
                  })),
                hideVerb: true,
              },
              preposition: [],
              hideSubject: true,
            };
          case "verb":
            return null;
        }
      },
    );
}
export function clause(clause: TokiPona.Clause): Output<English.Clause> {
  switch (clause.type) {
    case "phrases":
      return phraseClause(clause.phrases);
    case "o vocative":
      return multiplePhrases(clause.phrases, "object", null, "en")
        .map((phrase) => {
          if (phrase.type === "noun") {
            return { type: "vocative", call: "hey", addressee: phrase.noun };
          } else {
            throw new FilteredOutError("adjective within o vocative");
          }
        });
    case "prepositions":
    case "li clause":
    case "o clause":
    case "quotation":
      return new Output(new TranslationTodoError(clause.type));
  }
}
