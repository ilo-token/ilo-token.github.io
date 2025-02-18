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
  return multiplePhrases(phrases, "object", true, "en", false)
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
                perspective: "third",
                postAdjective: null,
                preposition: [],
                emphasis: false,
              },
              verb: {
                type: "default",
                adverb: [],
                verb: {
                  modal: null,
                  finite: [],
                  infinite: unemphasized("is"),
                },
                subjectComplement: {
                  type: "adjective",
                  adjective: phrase.adjective,
                },
                object: null,
                objectComplement: null,
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
            throw new FilteredOutError("verb as interjection");
        }
      },
    );
}
export function clause(clause: TokiPona.Clause): Output<English.Clause> {
  switch (clause.type) {
    case "phrases":
      return phraseClause(clause.phrases);
    case "o vocative":
      return multiplePhrases(clause.phrases, "object", true, "en", false)
        .map((phrase) => {
          if (phrase.type === "noun") {
            return { type: "vocative", call: "hey", addressee: phrase.noun };
          } else {
            throw new FilteredOutError(`${phrase.type} within o vocative`);
          }
        });
    case "prepositions":
    case "li clause":
    case "o clause":
    case "quotation":
      return new Output(new TranslationTodoError(clause.type));
  }
}
