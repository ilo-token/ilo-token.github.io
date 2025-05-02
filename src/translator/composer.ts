import { compound, nullableAsArray } from "../../misc/misc.ts";
import * as English from "./ast.ts";

const EMPHASIS_STARTING_TAG = "<strong>";
const EMPHASIS_ENDING_TAG = "</strong>";

function word(word: English.Word) {
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
        ...phrases.determiners.map(({ determiner }) => word(determiner)),
        ...phrases.adjectives.map(adjective),
        word(phrases.noun),
        ...nullableAsArray(phrases.postAdjective)
          .map(({ adjective, name }) => `${adjective} ${name}`),
        ...nullableAsArray(phrases.postCompound)
          .map((phrase) => noun(phrase, 0)),
        ...phrases.prepositions.map(preposition),
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
      text = [
        ...phrases.adverbs.map(({ adverb }) => word(adverb)),
        word(phrases.adjective),
      ]
        .join(" ");
      break;
    case "compound":
      text = compound(
        phrases.adjectives.map((phrase) => adjective(phrase, depth + 1)),
        phrases.conjunction,
        depth !== 0,
      );
  }
  return word({ word: text, emphasis: phrases.emphasis });
}
function preposition(preposition: English.Preposition) {
  return word({
    word: `${word(preposition.preposition)} ${noun(preposition.object, 0)}`,
    emphasis: preposition.emphasis,
  });
}
function complement(complement: English.Complement) {
  switch (complement.type) {
    case "noun":
      return noun(complement.noun, 0);
    case "adjective":
      return adjective(complement.adjective, 0);
  }
}
function singeVerb(verbAdverb: English.Verb) {
  const { preAdverbs, verb, postAdverb } = verbAdverb;
  const verbPost = verb.word === "can" && postAdverb != null &&
      postAdverb.adverb.word === "not"
    ? `${word(verb)}${word(postAdverb.adverb)}`
    : [verb, ...nullableAsArray(postAdverb).map(({ adverb }) => adverb)]
      .map(word)
      .join(" ");
  return [
    ...preAdverbs.map(({ adverb }) => word(adverb)),
    verbPost,
  ]
    .join(" ");
}
export function verb(phrase: English.VerbPhrase, depth: number): string {
  let text: string;
  switch (phrase.type) {
    case "simple": {
      const { verb: { modal, verbs } } = phrase;
      const verbText = !phrase.hideVerb
        ? [
          ...nullableAsArray(modal),
          ...verbs,
        ]
          .map(singeVerb)
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
    ...phrase.prepositions.map(preposition),
  ]
    .join(" ");
}
function clause(ast: English.Clause): string {
  switch (ast.type) {
    case "simple": {
      const subject = !ast.hideSubject ? [noun(ast.subject, 0)] : [];
      return [
        ...subject,
        verb(ast.verb, 0),
      ]
        .join(" ");
    }
    case "interjection":
      return word(ast.interjection);
    case "subject phrase":
      return noun(ast.subject, 0);
    case "vocative":
      return `${ast.call} ${noun(ast.addressee, 0)}`;
    case "preposition":
      return preposition(ast);
    case "adverb":
      return word(ast.adverb);
    case "dependent":
      return `${word(ast.conjunction)} ${clause(ast.clause)}`;
  }
}
function sentence(sentence: English.Sentence): string {
  const capitalized = capitalize(sentence.clauses.map(clause).join(", "));
  return `${capitalized}${sentence.punctuation}`;
}
export function multipleSentences(
  sentences: English.MultipleSentences,
): string {
  switch (sentences.type) {
    case "free form":
      return capitalize(sentences.text);
    case "sentences":
      return sentences.sentences.map(sentence).join(" ");
  }
}
function capitalize(text: string) {
  return text.replace(
    /(?<![<&\p{Alpha}\p{Nd}\p{Nl}\p{No}])[\p{Alpha}\p{Nd}\p{Nl}\p{No}]/u,
    (character) => character.toLocaleUpperCase(),
  );
}
