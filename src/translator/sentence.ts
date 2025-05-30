import { nullableAsArray } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import { dictionary } from "../dictionary.ts";
import * as TokiPona from "../parser/ast.ts";
import { definitionAsPlainString } from "./as_string.ts";
import * as English from "./ast.ts";
import { clause, contextClause, unwrapSingleWord } from "./clause.ts";
import { TranslationTodoError } from "./error.ts";
import { noEmphasis, word } from "./word.ts";
import { fromSimpleDefinition, getReduplicationCount } from "./word_unit.ts";

function filler(filler: TokiPona.Filler) {
  switch (filler.type) {
    case "word":
    case "long word": {
      let length: number;
      switch (filler.type) {
        case "word":
          length = 1;
          break;
        case "long word":
          length = filler.length;
          break;
      }
      return IterableResult.fromArray(dictionary.get(filler.word)!.definitions)
        .filterMap((definition) => {
          if (definition.type === "filler") {
            const { before, repeat, after } = definition;
            return `${before}${repeat.repeat(length)}${after}`;
          } else {
            return null;
          }
        });
    }
    case "reduplicated a":
      return IterableResult.single("ha".repeat(filler.count));
  }
}
function emphasisAsPunctuation(
  options: Readonly<{
    emphasis: null | TokiPona.Emphasis;
    interrogative: boolean;
    originalPunctuation: string;
  }>,
) {
  const { emphasis, interrogative, originalPunctuation } = options;
  if (emphasis == null) {
    if (interrogative) {
      return "?";
    } else {
      return originalPunctuation;
    }
  } else {
    const questionMark = interrogative ? "?" : "";
    let exclamationMark: string;
    switch (emphasis.type) {
      case "word":
        exclamationMark = "!";
        break;
      case "long word":
        exclamationMark = "!".repeat(emphasis.length);
        break;
    }
    return `${questionMark}${exclamationMark}`;
  }
}
function sentence(
  sentence: TokiPona.Sentence,
  isFinal: boolean,
): IterableResult<English.Sentence> {
  if (sentence.interrogative === "x ala x") {
    return IterableResult.errors([new TranslationTodoError("x ala x")]);
  }
  const punctuation = !isFinal && sentence.punctuation === ""
    ? ","
    : sentence.punctuation;
  switch (sentence.type) {
    case "simple": {
      let startingAdverb: IterableResult<null | English.Word>;
      let startingConjunction: null | English.Word;
      let contextClauses: ReadonlyArray<TokiPona.ContextClause>;
      if (sentence.startingParticle != null) {
        const { startingParticle } = sentence;
        const emphasis = startingParticle.emphasis != null;
        const reduplicationCount = getReduplicationCount(startingParticle);
        contextClauses = sentence.contextClauses;
        switch (sentence.startingParticle.word as "taso" | "kin" | "anu") {
          case "taso":
            startingAdverb = IterableResult.single(null);
            startingConjunction = word({
              reduplicationCount,
              emphasis,
              word: "but",
            });
            break;
          case "kin":
            startingAdverb = fromSimpleDefinition(
              startingParticle,
              (definition) =>
                definition.type === "adverb" ? definition.adverb : null,
            );
            startingConjunction = null;
            break;
          case "anu":
            startingAdverb = IterableResult.single(null);
            startingConjunction = word({
              reduplicationCount,
              emphasis,
              word: "or",
            });
            break;
        }
      } else if (
        sentence.contextClauses.length > 0 &&
        sentence.contextClauses[0].type === "anu"
      ) {
        const anu = sentence.contextClauses[0];
        startingAdverb = IterableResult.single(null);
        startingConjunction = word({
          reduplicationCount: getReduplicationCount(anu.anu),
          emphasis: anu.anu.emphasis != null,
          word: "or",
        });
        contextClauses = sentence.contextClauses.slice(1);
      } else {
        startingAdverb = IterableResult.single(null);
        startingConjunction = null;
        contextClauses = sentence.contextClauses;
      }
      const useAnuSeme = nullableAsArray(sentence.anuSeme)
        .map((seme): English.Clause => ({
          type: "interjection",
          interjection: word({
            word: "right",
            reduplicationCount: getReduplicationCount(seme),
            emphasis: seme.emphasis != null,
          }),
        }));
      const interjectionClause: IterableResult<English.Clause> =
        contextClauses.length === 0 &&
          sentence.startingParticle == null
          ? IterableResult.fromArray(
            nullableAsArray(unwrapSingleWord(sentence.finalClause)),
          )
            .flatMap((wordUnit) =>
              fromSimpleDefinition(
                wordUnit,
                (definition) =>
                  definition.type === "interjection"
                    ? definition.interjection
                    : null,
              )
            )
            .map((interjection): English.Clause => ({
              type: "interjection",
              interjection,
            }))
          : IterableResult.empty();
      const clauses = IterableResult.combine(
        startingAdverb,
        IterableResult.combine(...contextClauses.map(contextClause))
          .map((clause) => clause.flat()),
        IterableResult.concat(interjectionClause, clause(sentence.finalClause)),
      )
        .map(([adverb, contextClauses, lastClause]) => [
          ...nullableAsArray(adverb)
            .map((adverb): English.Clause => ({ type: "adverb", adverb })),
          ...contextClauses,
          lastClause,
          ...useAnuSeme,
        ]);
      let withConjunction: IterableResult<ReadonlyArray<English.Clause>>;
      if (startingConjunction != null) {
        withConjunction = clauses
          .map<ReadonlyArray<English.Clause>>(([first, ...rest]) => [
            {
              type: "dependent",
              conjunction: startingConjunction,
              clause: first,
            },
            ...rest,
          ]);
      } else {
        withConjunction = clauses;
      }
      const usePunctuation = emphasisAsPunctuation({
        emphasis: sentence.emphasis,
        interrogative: sentence.interrogative != null,
        originalPunctuation: punctuation,
      });
      return withConjunction.map((clauses): English.Sentence => ({
        clauses,
        punctuation: usePunctuation,
      }));
    }
    case "filler":
      return filler(sentence.filler)
        .map((interjection): English.Sentence => ({
          clauses: [
            {
              type: "interjection",
              interjection: noEmphasis(interjection),
            },
          ],
          punctuation,
        }));
  }
}
export function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): IterableResult<English.MultipleSentences> {
  switch (sentences.type) {
    case "single word": {
      const { word } = sentences;
      return IterableResult.fromArray(dictionary.get(word)!.definitions)
        .flatMap(definitionAsPlainString)
        .map((definition): English.MultipleSentences => ({
          type: "free form",
          text: definition,
        }));
    }
    case "sentences":
      return IterableResult.combine(
        ...sentences.sentences.map((value, i) =>
          sentence(value, i === sentences.sentences.length - 1)
        ),
      )
        .map((sentences): English.MultipleSentences => ({
          type: "sentences",
          sentences,
        }));
  }
}
