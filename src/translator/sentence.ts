import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { dictionary } from "../dictionary.ts";
import { nullableAsArray, repeatWithSpace } from "../misc.ts";
import { Output } from "../output.ts";
import { definitionAsPlainString } from "./as-string.ts";
import { clause } from "./clause.ts";
import { TranslationTodoError } from "./error.ts";

function filler(filler: TokiPona.Emphasis): Output<string> {
  switch (filler.type) {
    case "word":
    case "long word": {
      const definitions = dictionary[filler.word]
        .definitions
        .filter((definition) => definition.type === "filler");
      let length: number;
      switch (filler.type) {
        case "word":
          length = 1;
          break;
        case "long word":
          length = filler.length;
          break;
      }
      return new Output(
        definitions
          .map((definition) =>
            `${definition.before}${
              definition.repeat.repeat(length)
            }${definition.after}`
          ),
      );
    }
    case "multiple a":
      return new Output(["ha".repeat(filler.count)]);
  }
}
function emphasisAsPunctuation(
  emphasis: undefined | null | TokiPona.Emphasis,
  interrogative: boolean,
): null | string {
  let questionMark: string;
  if (interrogative) {
    questionMark = "?";
  } else {
    questionMark = "";
  }
  let exclamationMark: string;
  if (emphasis == null) {
    return null;
  } else {
    switch (emphasis.type) {
      case "word":
        switch (emphasis.word as "a" | "n") {
          case "a":
            exclamationMark = "!";
            break;
          case "n":
            return null;
        }
        break;
      case "long word":
        switch (emphasis.word as "a" | "n") {
          case "a":
            exclamationMark = "!".repeat(emphasis.length);
            break;
          case "n":
            return null;
        }
        break;
      case "multiple a":
        return null;
    }
  }
  return `${questionMark}${exclamationMark}`;
}
function interjection(clause: TokiPona.Clause): Output<English.Clause> {
  if (clause.type === "phrases" && clause.phrases.type === "single") {
    const phrase = clause.phrases.phrase;
    if (phrase.type === "default" && phrase.modifiers.length === 0) {
      const headWord = phrase.headWord;
      if (headWord.type === "default" || headWord.type === "reduplication") {
        return new Output(dictionary[headWord.word].definitions)
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
  return new Output();
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
): Output<English.Sentence> {
  // This relies on sentence filter, if some of those filters were disabled,
  // this function might break.
  if (sentence.interrogative === "x ala x") {
    throw new TranslationTodoError("x ala x");
  }
  if (sentence.finalClause.type === "filler") {
    return filler(sentence.finalClause.emphasis)
      .map<English.Sentence>((interjection) => ({
        clauses: [{
          type: "interjection",
          interjection: {
            word: interjection,
            emphasis: false,
          },
        }],
        punctuation: sentence.punctuation,
      }));
  } else {
    const startingParticle = ((sentence.laClauses[0] ?? sentence.finalClause) as
      & TokiPona.FullClause
      & { type: "default" })
      .startingParticle;
    let startingFiller: Output<null | English.Clause>;
    if (startingParticle == null) {
      startingFiller = new Output([null]);
    } else {
      startingFiller = filler(startingParticle)
        .map((interjection) => ({
          type: "interjection",
          interjection: {
            word: interjection,
            emphasis: false,
          },
        }));
    }
    const laClauses =
      (sentence.laClauses as Array<TokiPona.FullClause & { type: "default" }>)
        .map(({ clause }) => clause);
    const givenClauses = Output
      .combine(...laClauses.map(clause))
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
    const {
      kinOrTaso,
      clause: lastTpClause,
      anuSeme: tpAnuSeme,
      endingParticle,
    } = sentence.finalClause;
    if (kinOrTaso != null) {
      throw new TranslationTodoError(`"${kinOrTaso.word}" preclause`);
    }
    const lastEngClause = clause(lastTpClause);
    let right: Array<English.Clause>;
    if (tpAnuSeme == null) {
      right = [];
    } else {
      right = [anuSeme(tpAnuSeme)];
    }
    let interjectionClause: Output<English.Clause>;
    if (
      sentence.laClauses.length === 0 && kinOrTaso == null && tpAnuSeme == null
    ) {
      interjectionClause = interjection(lastTpClause);
    } else {
      interjectionClause = new Output();
    }
    const engClauses = Output.combine(
      startingFiller,
      givenClauses,
      Output.concat(interjectionClause, lastEngClause),
    )
      .map(([filler, givenClauses, lastClause]) => [
        ...nullableAsArray(filler),
        ...givenClauses,
        lastClause,
        ...right,
      ]);
    let endingFiller: Output<null | English.Clause>;
    if (endingParticle == null) {
      endingFiller = new Output([null]);
    } else {
      endingFiller = filler(endingParticle)
        .map((interjection) => ({
          type: "interjection",
          interjection: {
            word: interjection,
            emphasis: false,
          },
        }));
    }
    let punctuation: string;
    if (sentence.interrogative) {
      punctuation = "?";
    } else {
      punctuation = sentence.punctuation;
    }
    return Output.concat(
      Output.combine(
        engClauses,
        new Output(
          nullableAsArray(
            emphasisAsPunctuation(
              endingParticle,
              sentence.interrogative != null,
            ),
          ),
        ),
      )
        .map(([clauses, punctuation]) => ({ clauses, punctuation })),
      Output.combine(engClauses, endingFiller)
        .map(([clauses, filler]) => ({
          clauses: [...clauses, ...nullableAsArray(filler)],
          punctuation,
        })),
    );
  }
}
export function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): Output<Array<English.Sentence>> {
  switch (sentences.type) {
    case "single word": {
      const { word } = sentences;
      return new Output(dictionary[word].definitions)
        .flatMap(definitionAsPlainString)
        .map<English.Sentence>((definition) => ({
          clauses: [{ type: "free form", text: definition }],
          punctuation: "",
        }))
        .map((definition) => [definition]);
    }
    case "sentences":
      return Output.combine(...sentences.sentences.map(sentence));
  }
}
