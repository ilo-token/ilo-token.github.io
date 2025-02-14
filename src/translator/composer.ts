import { nullableAsArray } from "../misc.ts";
import { Output } from "../output.ts";
import { parse } from "../parser/parser.ts";
import * as English from "./ast.ts";
import { multipleSentences } from "./sentence.ts";

const EMPHASIS_STARTING_TAG = "<strong>";
const EMPHASIS_ENDING_TAG = "</strong>";

// class ComposingTodoError extends TodoError {
//   constructor(type: string) {
//     super(`composing ${type}`);
//     this.name = "ComposingTodoError";
//   }
// }
function word(word: English.Word): string {
  if (word.emphasis) {
    return `${EMPHASIS_STARTING_TAG}${word.word}${EMPHASIS_ENDING_TAG}`;
  } else {
    return word.word;
  }
}
function compound(
  elements: Array<string>,
  conjunction: string,
  depth: number,
): string {
  if (depth !== 0 || elements.length <= 2) {
    return elements.join(` ${conjunction} `);
  } else {
    const lastIndex = elements.length - 1;
    const init = elements.slice(0, lastIndex);
    const last = elements[lastIndex];
    return `${init.map((item) => `${item},`).join(" ")} ${conjunction} ${last}`;
  }
}
function noun(phrases: English.NounPhrase, depth: number): string {
  switch (phrases.type) {
    case "simple": {
      const text = [
        ...phrases.determiner.map((determiner) => word(determiner.determiner)),
        ...phrases.adjective.map(adjective),
        word(phrases.noun),
        ...nullableAsArray(phrases.postAdjective)
          .map((adjective) => `${adjective.adjective} ${adjective.name}`),
        ...phrases.preposition.map(preposition),
      ]
        .join(" ");
      return word({ word: text, emphasis: phrases.emphasis });
    }
    case "compound":
      return compound(
        phrases.nouns.map((phrase) => noun(phrase, depth + 1)),
        phrases.conjunction,
        depth,
      );
  }
}
function adjective(phrases: English.AdjectivePhrase, depth: number): string {
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
        depth,
      );
  }
  return word({ word: text, emphasis: phrases.emphasis });
}
function preposition(preposition: English.Preposition): string {
  return `${word(preposition.preposition)} ${noun(preposition.object, 0)}`;
}
function subjectComplement(
  subjectComplement: English.SubjectComplement,
): string {
  switch (subjectComplement.type) {
    case "noun":
      return noun(subjectComplement.noun, 0);
    case "adjective":
      return adjective(subjectComplement.adjective, 0);
  }
}
function verb(phrase: English.VerbPhrase, depth: number): string {
  let text: string;
  switch (phrase.type) {
    case "default": {
      let verbText: Array<string>;
      if (phrase.hideVerb) {
        verbText = [];
      } else {
        verbText = [word(phrase.verb)];
      }
      text = [
        ...phrase.adverb.map(word),
        ...verbText,
        ...nullableAsArray(phrase.subjectComplement).map(subjectComplement),
      ]
        .join(" ");
      break;
    }
    case "compound":
      text = compound(
        phrase.verbs.map((item) => verb(item, depth + 1)),
        phrase.conjunction,
        depth,
      );
  }
  return [
    text,
    ...nullableAsArray(phrase.object).map(noun, 0),
    ...phrase.preposition.map(preposition),
  ]
    .join(" ");
}
function defaultClause(clause: English.Clause & { type: "default" }): string {
  let subject: Array<string>;
  if (clause.hideSubject) {
    subject = [];
  } else {
    subject = [noun(clause.subject, 0)];
  }
  return [
    ...subject,
    verb(clause.verb, 0),
    ...clause.preposition.map(preposition),
  ]
    .join(" ");
}
function clause(ast: English.Clause): string {
  switch (ast.type) {
    case "free form":
      return ast.text;
    case "default":
      return defaultClause(ast);
    case "interjection":
      return word(ast.interjection);
    case "subject phrase":
      return noun(ast.subject, 0);
    case "vocative":
      return `${ast.call} ${noun(ast.addressee, 0)}`;
    case "dependent":
      return `${word(ast.conjunction)} ${clause(ast.clause)}`;
  }
}
function sentence(sentence: English.Sentence): string {
  return `${sentence.clauses.map(clause).join(", ")}${sentence.punctuation}`;
}
export function translate(src: string): Output<string> {
  return parse(src)
    .flatMap(multipleSentences)
    .map((sentences) => sentences.map(sentence).join(" "));
}
