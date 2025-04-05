import { ArrayResult } from "../array_result.ts";
import { dictionary } from "../dictionary.ts";
import { nullableAsArray, repeatWithSpace } from "../../misc/misc.ts";
import * as TokiPona from "../parser/ast.ts";
import { definitionAsPlainString } from "./as_string.ts";
import * as English from "./ast.ts";
import { clause, contextClause } from "./clause.ts";
import { FilteredError, TranslationTodoError } from "./error.ts";
import { noEmphasis } from "./word.ts";

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
  }
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
function interjection(clause: TokiPona.Clause): ArrayResult<English.Clause> {
  if (clause.type === "phrases" && clause.phrases.type === "single") {
    const { phrases: { phrase } } = clause;
    if (phrase.type === "default" && phrase.modifiers.length === 0) {
      const { headWord } = phrase;
      switch (headWord.type) {
        case "default":
        case "reduplication":
          return new ArrayResult(dictionary.get(headWord.word)!.definitions)
            .filterMap((definition) => {
              if (definition.type === "interjection") {
                switch (headWord.type) {
                  case "default":
                    return definition.interjection;
                  case "reduplication":
                    return repeatWithSpace(
                      definition.interjection,
                      headWord.count,
                    );
                }
              } else {
                return null;
              }
            })
            .map<English.Clause>((interjection) => ({
              type: "interjection",
              interjection: {
                word: interjection,
                emphasis: headWord.emphasis != null,
              },
            }));
      }
    }
  }
  return new ArrayResult();
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
      const laClauses = sentence.laClauses;
      const givenClauses = ArrayResult.combine(
        ...laClauses.map(contextClause),
      )
        .map((clauses) =>
          clauses.map<English.Clause>((clause) => ({
            type: "dependent",
            conjunction: {
              word: "given",
              emphasis: false,
            },
            clause,
          }))
        );
      if (sentence.startingParticle != null) {
        return new ArrayResult(
          new TranslationTodoError(
            `"${sentence.startingParticle.word}" starting particle`,
          ),
        );
      }
      const lastEngClause = clause(sentence.finalClause);
      const right = nullableAsArray(sentence.anuSeme).map(anuSeme);
      const interjectionClause =
        sentence.laClauses.length === 0 && sentence.startingParticle == null &&
          sentence.startingParticle == null
          ? interjection(sentence.finalClause)
          : new ArrayResult<English.Clause>();
      const engClauses = ArrayResult.combine(
        givenClauses,
        ArrayResult.concat(interjectionClause, lastEngClause),
      )
        .map(([givenClauses, lastClause]) => [
          ...givenClauses,
          lastClause,
          ...right,
        ]);
      const usePunctuation = emphasisAsPunctuation({
        emphasis: sentence.emphasis,
        interrogative: sentence.interrogative != null,
        originalPunctuation: punctuation,
      });
      return engClauses.map((clauses) => ({
        type: "sentence",
        clauses,
        punctuation: usePunctuation,
      }));
    }
    case "filler":
      return filler(sentence.filler)
        .map<English.Sentence>((interjection) => ({
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
): ArrayResult<ReadonlyArray<English.Sentence>> {
  switch (sentences.type) {
    case "single word": {
      const { word } = sentences;
      return new ArrayResult(dictionary.get(word)!.definitions)
        .flatMap(definitionAsPlainString)
        .map<English.Sentence>((definition) => ({
          type: "free form",
          text: definition,
        }))
        .map((definition) => [definition]);
    }
    case "sentences":
      return ArrayResult.combine(
        ...sentences.sentences.map((value, i) =>
          sentence(value, i === sentences.sentences.length - 1)
        ),
      );
  }
}
