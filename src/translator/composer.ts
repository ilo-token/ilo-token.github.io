import { compound, nullableAsArray } from "../../misc/misc.ts";
import * as English from "./ast.ts";

const EMPHASIS_STARTING_TAG = "<strong>";
const EMPHASIS_ENDING_TAG = "</strong>";

function word(word: English.Word): string {
  if (word.emphasis) {
    return `${EMPHASIS_STARTING_TAG}${word.word}${EMPHASIS_ENDING_TAG}`;
  } else {
    return word.word;
  }
}
export function noun(phrases: English.NounPhrase, depth: number): string {
  switch (phrases.type) {
    case "simple": {
      const text = [
        ...phrases.determiner.map(({ determiner }) => word(determiner)),
        ...phrases.adjective.map(adjective),
        word(phrases.noun),
        ...nullableAsArray(phrases.postAdjective)
          .map(({ adjective, name }) => `${adjective} ${name}`),
        ...phrases.preposition.map(preposition),
      ]
        .join(" ");
      return word({ word: text, emphasis: phrases.emphasis });
    }
    case "compound":
      return compound(
        phrases.nouns.map((phrase) => noun(phrase, depth + 1)),
        phrases.conjunction,
        depth !== 0,
      );
  }
}
export function adjective(
  phrases: English.AdjectivePhrase,
  depth: number,
): string {
  let text: string;
  switch (phrases.type) {
    case "simple":
      text = [...phrases.adverb.map(word), word(phrases.adjective)]
        .join(" ");
      break;
    case "compound":
      text = compound(
        phrases.adjective.map((phrase) => adjective(phrase, depth + 1)),
        phrases.conjunction,
        depth !== 0,
      );
  }
  return word({ word: text, emphasis: phrases.emphasis });
}
function preposition(preposition: English.Preposition): string {
  return word({
    word: `${word(preposition.preposition)} ${noun(preposition.object, 0)}`,
    emphasis: preposition.emphasis,
  });
}
function complement(
  complement: English.Complement,
): string {
  switch (complement.type) {
    case "noun":
      return noun(complement.noun, 0);
    case "adjective":
      return adjective(complement.adjective, 0);
  }
}
export function adverbVerb(verbAdverb: English.AdverbVerb): string {
  const { adverb, verb } = verbAdverb;
  return [...adverb, verb].map(word).join(" ");
}
export function verb(phrase: English.VerbPhrase, depth: number): string {
  let text: string;
  switch (phrase.type) {
    case "default": {
      const { verb: { modal, verb } } = phrase;
      const verbText = !phrase.hideVerb
        ? [
          ...nullableAsArray(modal),
          ...verb,
        ]
          .map(adverbVerb)
        : [];
      text = [
        ...verbText,
        ...nullableAsArray(phrase.subjectComplement).map(complement),
        ...nullableAsArray(phrase.contentClause).map(clause),
      ]
        .join(" ");
      break;
    }
    case "compound":
      text = compound(
        phrase.verbs.map((item) => verb(item, depth + 1)),
        phrase.conjunction,
        depth !== 0,
      );
  }
  return [
    text,
    ...nullableAsArray(phrase.object).map(noun, 0),
    ...nullableAsArray(phrase.objectComplement).map(complement),
    ...phrase.preposition.map(preposition),
  ]
    .join(" ");
}
function defaultClause(clause: English.Clause & { type: "default" }): string {
  const subject = !clause.hideSubject ? [noun(clause.subject, 0)] : [];
  return [
    ...subject,
    verb(clause.verb, 0),
  ]
    .join(" ");
}
function clause(ast: English.Clause): string {
  switch (ast.type) {
    case "default":
      return defaultClause(ast);
    case "interjection":
      return word(ast.interjection);
    case "subject phrase":
      return noun(ast.subject, 0);
    case "vocative":
      return `${ast.call} ${noun(ast.addressee, 0)}`;
    case "preposition":
      return preposition(ast);
    case "dependent":
      return `${word(ast.conjunction)} ${clause(ast.clause)}`;
  }
}
function sentence(sentence: English.Sentence): string {
  let text: string;
  switch (sentence.type) {
    case "free form":
      text = sentence.text;
      break;
    case "sentence":
      text = `${
        sentence.clauses.map(clause).join(", ")
      }${sentence.punctuation}`;
      break;
  }
  return text.replace(
    /(?<![<&\p{Alpha}\p{Nd}\p{Nl}\p{No}])[\p{Alpha}\p{Nd}\p{Nl}\p{No}]/u,
    (character) => character.toLocaleUpperCase(),
  );
}
export function multipleSentences(
  sentences: ReadonlyArray<English.Sentence>,
): string {
  return sentences.map(sentence).join(" ");
}
