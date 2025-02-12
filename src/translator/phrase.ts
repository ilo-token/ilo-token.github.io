import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { nullableAsArray, repeatWithSpace } from "../misc.ts";
import { Output } from "../output.ts";
import { wordUnit } from "./word-unit.ts";
import { multipleModifiers } from "./modifier.ts";
import { findNumber, fixDeterminer } from "./determiner.ts";
import { fixAdjective } from "./adjective.ts";
import { nounForms } from "./noun.ts";
import { CONJUNCTION } from "./misc.ts";
import { OutputError } from "../mod.ts";
import * as Composer from "../parser/composer.ts";
import { ExhaustedError, TranslationTodoError } from "./error.ts";

type PhraseTranslation =
  | { type: "noun"; noun: English.NounPhrase }
  | {
    type: "adjective";
    adjective: English.AdjectivePhrase;
    inWayPhrase: null | English.NounPhrase;
  };
function defaultPhrase(
  phrase: TokiPona.Phrase & { type: "default" },
  place: "subject" | "object",
): Output<PhraseTranslation> {
  return Output.combine(
    wordUnit(phrase.headWord, place),
    multipleModifiers(phrase.modifiers),
  )
    .flatMap<PhraseTranslation>(([headWord, modifier]) => {
      if (headWord.type === "noun" && modifier.type === "adjectival") {
        let count: number;
        switch (phrase.headWord.type) {
          case "number":
          case "default":
            count = 1;
            break;
          case "x ala x":
            throw new TranslationTodoError("x ala x");
          case "reduplication":
            count = phrase.headWord.count;
            break;
        }
        const determiner = fixDeterminer([
          ...headWord.determiner,
          ...modifier.determiner,
        ]);
        const quantity = findNumber(determiner);
        const adjective = fixAdjective([
          ...modifier.adjective.slice().reverse(),
          ...headWord.adjective,
        ]);
        let postAdjective: null | {
          adjective: string;
          name: string;
        };
        if (headWord.postAdjective != null && modifier.name != null) {
          return new Output();
        } else if (headWord.postAdjective != null) {
          postAdjective = headWord.postAdjective;
        } else if (modifier.name != null) {
          postAdjective = { adjective: "named", name: modifier.name };
        } else {
          postAdjective = null;
        }
        const preposition = [
          ...nullableAsArray(modifier.inPositionPhrase)
            .map((object) => ({
              preposition: { word: "in", emphasis: false },
              object,
            })),
          ...nullableAsArray(modifier.ofPhrase)
            .map((object) => ({
              preposition: { word: "of", emphasis: false },
              object,
            })),
        ];
        if (
          preposition.length > 1 ||
          (preposition.length > 0 && postAdjective != null)
        ) {
          return new Output();
        }
        const headNoun = nounForms(headWord.singular, headWord.plural, quantity)
          .map((noun) => ({
            type: "simple" as const,
            determiner,
            adjective,
            noun: {
              word: repeatWithSpace(noun.noun, count),
              emphasis: phrase.headWord.emphasis != null,
            },
            quantity,
            postCompound: null,
            postAdjective,
            preposition,
            emphasis: phrase.emphasis != null &&
              modifier.nounPreposition == null,
          }));
        let noun: Output<English.NounPhrase>;
        if (modifier.nounPreposition == null) {
          noun = headNoun;
        } else if (
          modifier.ofPhrase != null && modifier.inPositionPhrase != null
        ) {
          noun = headNoun.map((noun) => ({
            ...modifier.nounPreposition!.noun as English.NounPhrase & {
              type: "simple";
            },
            preposition: [{
              preposition: {
                word: modifier.nounPreposition!.preposition,
                emphasis: false,
              },
              object: noun,
            }],
            emphasis: phrase.emphasis != null,
          }));
        } else {
          noun = new Output();
        }
        return noun
          .map<PhraseTranslation>((noun) => ({ type: "noun", noun }));
      } else if (
        headWord.type === "adjective" && modifier.type === "adverbial"
      ) {
        const adjective = headWord.adjective;
        if (adjective.type === "simple") {
          const adverb = [
            ...modifier.adverb.slice().reverse(),
            ...adjective.adverb,
          ];
          if (adverb.length > 1) {
            throw new OutputError(
              "chained adverbs are filtered out to avoid ambiguity",
            );
          }
          return new Output<PhraseTranslation>([{
            type: "adjective",
            adjective: {
              ...adjective,
              adverb,
              emphasis: phrase.emphasis != null,
            },
            inWayPhrase: modifier.inWayPhrase,
          }]);
        } else if (
          adjective.type === "compound" && modifier.adverb.length === 0
        ) {
          return new Output<PhraseTranslation>([{
            type: "adjective",
            adjective,
            inWayPhrase: modifier.inWayPhrase,
          }]);
        } else {
          return new Output();
        }
      } else {
        return new Output();
      }
    })
    .addError(() => new ExhaustedError(Composer.phrase(phrase)));
}
export function phrase(
  phrase: TokiPona.Phrase,
  place: "subject" | "object",
): Output<PhraseTranslation> {
  switch (phrase.type) {
    case "default":
      return defaultPhrase(phrase, place);
    case "preverb":
    case "preposition":
    case "quotation":
      return new Output(new TranslationTodoError(phrase.type));
  }
}
export function multiplePhrases(
  phrases: TokiPona.MultiplePhrases,
  place: "subject" | "object",
  particle: string,
): Output<PhraseTranslation> {
  switch (phrases.type) {
    case "single":
      return phrase(phrases.phrase, place);
    case "and conjunction":
    case "anu": {
      const conjunction = CONJUNCTION[phrases.type];
      return Output
        .combine(
          ...phrases.phrases.map((phrases) =>
            multiplePhrases(phrases, place, particle)
          ),
        )
        .filterMap<PhraseTranslation | null>((phrase) => {
          if (phrase.every((phrase) => phrase.type === "noun")) {
            const nouns = phrase
              .map((noun) => noun.noun)
              .flatMap((noun) => {
                if (
                  noun.type === "compound" &&
                  noun.conjunction === conjunction
                ) {
                  return noun.nouns;
                } else {
                  return [noun];
                }
              });
            let quantity: English.Quantity;
            switch (conjunction) {
              case "and":
                quantity = "plural";
                break;
              case "or":
                quantity = nouns[nouns.length - 1].quantity;
                break;
            }
            return {
              type: "noun",
              noun: {
                type: "compound",
                conjunction,
                nouns,
                preposition: [],
                quantity,
              },
            };
          } else if (
            phrases.type === "anu" &&
            phrase.every((phrase) =>
              phrase.type === "adjective" && phrase.inWayPhrase == null
            )
          ) {
            return {
              type: "adjective",
              adjective: {
                type: "compound",
                conjunction,
                adjective: phrase
                  .map((adjective) =>
                    (adjective as PhraseTranslation & { type: "adjective" })
                      .adjective
                  )
                  .flatMap((adjective) => {
                    if (
                      adjective.type === "compound" &&
                      adjective.conjunction === conjunction
                    ) {
                      return adjective.adjective;
                    } else {
                      return [adjective];
                    }
                  }),
                emphasis: false,
              },
              inWayPhrase: null,
            };
          } else {
            return null;
          }
        })
        .addError(() =>
          new ExhaustedError(Composer.multiplePhrases(phrases, particle))
        );
    }
  }
}
