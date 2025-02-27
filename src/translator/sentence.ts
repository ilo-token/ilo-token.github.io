import { ArrayResult } from "../array-result.ts";
import { dictionary, MissingEntryError } from "../dictionary.ts";
import { nullableAsArray, repeatWithSpace } from "../misc.ts";
import * as TokiPona from "../parser/ast.ts";
import { definitionAsPlainString } from "./as-string.ts";
import * as English from "./ast.ts";
import { clause, contextClause } from "./clause.ts";
import { TranslationTodoError, UntranslatableError } from "./error.ts";
import { unemphasized } from "./word.ts";

function filler(filler: TokiPona.Emphasis): ArrayResult<string> {
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
      return new ArrayResult(nullableAsArray(dictionary.get(filler.word)!))
        .flatMap((entry) => new ArrayResult(entry.definitions))
        .filterMap((definition) => {
          if (definition.type === "filler") {
            const { before, repeat, after } = definition;
            return `${before}${repeat.repeat(length)}${after}`;
          } else {
            return null;
          }
        })
        .addErrorWhenNone(() => new MissingEntryError("filler", filler.word));
    }
    case "multiple a":
      return new ArrayResult(["ha".repeat(filler.count)]);
  }
}
function emphasisAsPunctuation(
  emphasis: null | TokiPona.Emphasis,
  interrogative: boolean,
  originalPunctuation: string,
): string {
  if (emphasis == null) {
    if (interrogative) {
      return "?";
    } else {
      return originalPunctuation;
    }
  }
  if (
    (emphasis.type === "word" || emphasis.type === "long word") &&
    emphasis.word === "n"
  ) {
    throw new UntranslatableError('"n"', "punctuation");
  }
  let questionMark: string;
  if (interrogative) {
    questionMark = "?";
  } else {
    questionMark = "";
  }
  let exclamationMark: string;
  switch (emphasis.type) {
    case "word":
      exclamationMark = "!";
      break;
    case "long word":
      exclamationMark = "!".repeat(emphasis.length);
      break;
    case "multiple a":
      throw new UntranslatableError(
        `"${repeatWithSpace("a", emphasis.count)}"`,
        "punctuation",
      );
  }

  return `${questionMark}${exclamationMark}`;
}
function interjection(clause: TokiPona.Clause): ArrayResult<English.Clause> {
  if (clause.type === "phrases" && clause.phrases.type === "single") {
    const { phrase } = clause.phrases;
    if (phrase.type === "default" && phrase.modifiers.length === 0) {
      const { headWord } = phrase;
      if (headWord.type === "default" || headWord.type === "reduplication") {
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
  }
  return {
    type: "interjection",
    interjection: {
      word: interjection!,
      emphasis: seme.emphasis != null,
    },
  };
}
function sentence(
  sentence: TokiPona.Sentence,
  isFinal: boolean,
): ArrayResult<English.Sentence> {
  return ArrayResult.from(() => {
    if (sentence.interrogative === "x ala x") {
      return new ArrayResult(new TranslationTodoError("x ala x"));
    }
    let punctuation: string;
    if (!isFinal && sentence.punctuation === "") {
      punctuation = ",";
    } else {
      punctuation = sentence.punctuation;
    }
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
        if (sentence.kinOrTaso != null) {
          return new ArrayResult(
            new TranslationTodoError(`"${sentence.kinOrTaso.word}" preclause`),
          );
        }
        const lastEngClause = clause(sentence.finalClause);
        let right: Array<English.Clause>;
        if (sentence.anuSeme == null) {
          right = [];
        } else {
          right = [anuSeme(sentence.anuSeme)];
        }
        let interjectionClause: ArrayResult<English.Clause>;
        if (
          sentence.laClauses.length === 0 && sentence.kinOrTaso == null &&
          sentence.kinOrTaso == null
        ) {
          interjectionClause = interjection(sentence.finalClause);
        } else {
          interjectionClause = new ArrayResult();
        }
        const engClauses = ArrayResult.combine(
          givenClauses,
          ArrayResult.concat(interjectionClause, lastEngClause),
        )
          .map(([givenClauses, lastClause]) => [
            ...givenClauses,
            lastClause,
            ...right,
          ]);
        const usePunctuation = emphasisAsPunctuation(
          sentence.emphasis,
          sentence.interrogative != null,
          punctuation,
        );
        return engClauses.map((clauses) => ({
          clauses,
          punctuation: usePunctuation,
        }));
      }
      case "filler":
        return filler(sentence.emphasis)
          .map<English.Sentence>((interjection) => ({
            clauses: [{
              type: "interjection",
              interjection: unemphasized(interjection),
            }],
            punctuation,
          }));
    }
  });
}
export function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): ArrayResult<Array<English.Sentence>> {
  switch (sentences.type) {
    case "single word": {
      const { word } = sentences;
      return new ArrayResult(dictionary.get(word)!.definitions)
        .flatMap(definitionAsPlainString)
        .map<English.Sentence>((definition) => ({
          clauses: [{ type: "free form", text: definition }],
          punctuation: "",
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
