import { nullableAsArray, repeatWithSpace } from "../../misc/misc.ts";
import { ArrayResult } from "../array_result.ts";
import { dictionary } from "../dictionary.ts";
import * as TokiPona from "../parser/ast.ts";
import { definitionAsPlainString } from "./as_string.ts";
import * as English from "./ast.ts";
import { clause, contextClause, unwrapSingleWord } from "./clause.ts";
import { FilteredError, TranslationTodoError } from "./error.ts";
import { noEmphasis } from "./word.ts";
import { fromSimpleDefinition } from "./word_unit.ts";

function filler(filler: TokiPona.Filler): ArrayResult<string> {
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
      return new ArrayResult(dictionary.get(filler.word)!.definitions)
        .filterMap((definition) => {
          if (definition.type === "filler") {
            const { before, repeat, after } = definition;
            return `${before}${repeat.repeat(length)}${after}`;
          } else {
            return null;
          }
        });
    }
    case "multiple a":
      return new ArrayResult(["ha".repeat(filler.count)]);
  }
}
function emphasisAsPunctuation(
  options: Readonly<{
    emphasis: null | TokiPona.Emphasis;
    interrogative: boolean;
    originalPunctuation: string;
  }>,
): string {
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
function anuSeme(seme: TokiPona.HeadedWordUnit): English.Clause {
  let interjection: string;
  switch (seme.type) {
    case "default":
      interjection = "right";
      break;
    case "reduplication":
      interjection = repeatWithSpace("right", seme.count);
      break;
    case "x ala x":
      throw new FilteredError('"seme ala seme"');
  }
  return {
    type: "interjection",
    interjection: {
      word: interjection,
      emphasis: seme.emphasis != null,
    },
  };
}
function sentence(
  sentence: TokiPona.Sentence,
  isFinal: boolean,
): ArrayResult<English.Sentence> {
  if (sentence.interrogative === "x ala x") {
    return new ArrayResult(new TranslationTodoError("x ala x"));
  }
  const punctuation = !isFinal && sentence.punctuation === ""
    ? ","
    : sentence.punctuation;
  switch (sentence.type) {
    case "default": {
      if (sentence.startingParticle != null) {
        return new ArrayResult(
          new TranslationTodoError(
            `"${sentence.startingParticle.word}" starting particle`,
          ),
        );
      }
      const useAnuSeme = nullableAsArray(sentence.anuSeme).map(anuSeme);
      const interjectionClause: ArrayResult<English.Clause> =
        sentence.contextClauses.length === 0 &&
          sentence.startingParticle == null
          ? new ArrayResult(
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
            .map((interjection) => ({ type: "interjection", interjection }))
          : new ArrayResult();
      const clauses = ArrayResult.combine(
        ArrayResult.combine(...sentence.contextClauses.map(contextClause))
          .map((clause) => clause.flat()),
        ArrayResult.concat(interjectionClause, clause(sentence.finalClause)),
      )
        .map(([contextClauses, lastClause]) => [
          ...contextClauses,
          lastClause,
          ...useAnuSeme,
        ]);
      const usePunctuation = emphasisAsPunctuation({
        emphasis: sentence.emphasis,
        interrogative: sentence.interrogative != null,
        originalPunctuation: punctuation,
      });
      return clauses.map((clauses) => ({
        type: "sentence",
        clauses,
        punctuation: usePunctuation,
      }));
    }
    case "filler":
      return filler(sentence.filler)
        .map((interjection) => ({
          type: "sentence",
          clauses: [{
            type: "interjection",
            interjection: noEmphasis(interjection),
          }],
          punctuation,
        }));
  }
}
export function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): ArrayResult<English.MultipleSentences> {
  switch (sentences.type) {
    case "single word": {
      const { word } = sentences;
      return new ArrayResult(dictionary.get(word)!.definitions)
        .flatMap(definitionAsPlainString)
        .map((definition) => ({
          type: "free form",
          text: definition,
        }));
    }
    case "sentences":
      return ArrayResult.combine(
        ...sentences.sentences.map((value, i) =>
          sentence(value, i === sentences.sentences.length - 1)
        ),
      )
        .map((sentences) => ({ type: "sentences", sentences }));
  }
}
