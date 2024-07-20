import { parse } from "./ast-parser.ts";
import * as TokiPona from "./ast.ts";
import {
  CONTENT_WORD_DEFINITION,
  NUMERAL_DEFINITION,
  PARTICLE_DEFINITION,
  PREPOSITION_DEFINITION,
  SPECIAL_CONTENT_WORD_DEFINITION,
} from "./dictionary.ts";
import * as English from "./english-ast.ts";
import { TodoError } from "./error.ts";
import { nullableAsArray, repeat } from "./misc.ts";
import { Output } from "./output.ts";
import { settings } from "./settings.ts";

function clause(clause: TokiPona.Clause): Output<Array<English.Clause>> {
  return new Output(new TodoError("translation of clause"));
}
function filler(filler: TokiPona.Emphasis): Array<string> {
  switch (filler.type) {
    case "word":
      switch (filler.word as "a" | "n") {
        case "a":
          return ["ah", "oh", "ha", "eh", "um", "oy"];
        case "n":
          return ["hm", "uh", "mm", "er", "umm"];
      }
      // unreachable
      // fallthrough
    case "long word": {
      let output: Array<string>;
      switch (filler.word as "a" | "n") {
        case "a":
          output = ["ah", "oh", "ha", "eh", "um"];
          break;
        case "n":
          output = ["hm", "uh", "mm", "um"];
          break;
      }
      return output
        .map(([first, second]) => `${first}${repeat(second, filler.length)}`);
    }
    case "multiple a":
      return [repeat("ha", filler.count)];
  }
}
function sentence(
  sentence: TokiPona.Sentence,
): Output<Array<English.Sentence>> {
  if (sentence.finalClause.type === "filler") {
    return new Output(filler(sentence.finalClause.emphasis))
      .map((interjection) =>
        ({
          clause: {
            type: "interjection",
            interjection,
          },
          punctuation: sentence.punctuation,
        }) as English.Sentence
      )
      .map((sentence) => [sentence]);
  } else {
    return new Output(new TodoError("translation of sentence"));
  }
}
function allDefinition(word: string): Array<string> {
  const definitions = CONTENT_WORD_DEFINITION[word];
  if (definitions == null) {
    return [];
  }
  return definitions.flatMap((definition) => {
    switch (definition.type) {
      case "noun": {
        let nouns: Array<string>;
        switch (settings.get("number-settings")) {
          case "both":
            nouns = [
              ...nullableAsArray(definition.singular),
              ...nullableAsArray(definition.plural),
            ];
            break;
          case "condensed":
            nouns = [definition.condensed];
            break;
          case "default only":
            nouns = [definition.singular ?? definition.plural!];
            break;
        }
        return nouns.map((noun) =>
          `${
            definition.adjectives
              .map((adjective) => adjective.adjective)
              .join(" ")
          } ${noun}`
        );
      }
      case "personal pronoun":
        return [
          ...nullableAsArray(definition.singularSubject),
          ...nullableAsArray(definition.singularObject),
          ...nullableAsArray(definition.pluralSubject),
          ...nullableAsArray(definition.pluralObject),
        ];
      case "indefinite pronoun":
        return [definition.pronoun];
      case "adjective":
        return [
          `${
            definition.adverbs.map((adverb) => adverb.adverb).join(" ")
          } ${definition.adjective}`,
        ];
      case "compound adjective": {
        const { adjectives } = definition;
        if (adjectives.length === 2) {
          return [
            adjectives
              .map((adjective) => adjective.adjective)
              .join(" and "),
          ];
        } else {
          const lastIndex = adjectives.length - 1;
          const init = adjectives.slice(0, lastIndex);
          const last = adjectives[lastIndex];
          return `${
            init.map((adjective) => adjective.adjective).join(", ")
          }, and ${last.adjective}`;
        }
      }
      case "determiner":
        return [definition.determiner];
      case "adverb":
        return [definition.adverb];
      case "verb": {
        let verbs: Array<string>;
        switch (settings.get("tense-settings")) {
          case "both":
            verbs = [
              definition.past,
              definition.present,
              `will ${definition.present}`,
            ];
            break;
          case "condensed":
            verbs = [`(will) ${definition.condensed}`];
            break;
          case "default only":
            verbs = [definition.present];
            break;
        }
        let pastParticiple: null | string = null;
        if (definition.pastParticiple !== definition.past) {
          pastParticiple = definition.pastParticiple;
        }
        return [
          ...verbs,
          ...nullableAsArray(pastParticiple),
          definition.gerund,
        ];
      }
      case "interjection":
        return [definition.interjection];
    }
  });
}
function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): Output<Array<English.Sentence>> {
  switch (sentences.type) {
    case "single word": {
      const { word } = sentences;
      return new Output([
        ...PARTICLE_DEFINITION[word] ?? [],
        ...PREPOSITION_DEFINITION[word] ?? [],
        ...nullableAsArray(NUMERAL_DEFINITION[word]).map((num) => `${num}`),
        // TODO: Preverb
        ...SPECIAL_CONTENT_WORD_DEFINITION[word] ?? [],
        ...allDefinition(word),
      ])
        .map((definition) =>
          ({
            clause: { type: "free form", text: definition },
            punctuation: "",
          }) as English.Sentence
        )
        .map((definition) => [definition]);
    }
    case "sentences":
      return Output.combine(...sentences.sentences.map(sentence))
        .map((array) => array.flat());
  }
}
export function translate(src: string): Output<Array<English.Sentence>> {
  return parse(src).flatMap(multipleSentences);
}
