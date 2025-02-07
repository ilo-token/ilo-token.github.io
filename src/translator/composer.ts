import {
  AdjectivePhrase,
  Clause,
  NounPhrase,
  Preposition,
  Sentence,
  Word,
} from "./english-ast.ts";
import { nullableAsArray } from "../misc.ts";
import { Output, TodoError } from "../output.ts";
import { translate as translateToAst } from "./translator.ts";

const EMPHASIS_STARTING_TAG = "<strong>";
const EMPHASIS_ENDING_TAG = "</strong>";

function word(word: Word): string {
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
  if (depth !== 0 || elements.length === 2) {
    return elements.join(` ${conjunction} `);
  } else {
    const lastIndex = elements.length - 1;
    const init = elements.slice(0, lastIndex);
    const last = elements[lastIndex];
    return `${init.join(", ")} ${conjunction} ${last}`;
  }
}
function noun(phrases: NounPhrase, depth: number): string {
  switch (phrases.type) {
    case "simple": {
      const text = [
        ...phrases.determiner.map((determiner) => word(determiner.determiner)),
        ...phrases.adjective.map(adjective),
        word(phrases.noun),
        ...nullableAsArray(phrases.postCompound).map(noun),
        ...nullableAsArray(phrases.postAdjective)
          .map((adjective) => `${adjective.adjective} ${adjective.name}`),
        ...phrases.preposition.map(preposition),
      ].join(" ");
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
function adjective(phrases: AdjectivePhrase, depth: number): string {
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
function preposition(preposition: Preposition): string {
  return `${word(preposition.preposition)} ${noun(preposition.object, 0)}`;
}
function clause(ast: Clause): string {
  switch (ast.type) {
    case "free form":
      return ast.text;
    case "interjection":
      return word(ast.interjection);
    case "implied it's": {
      const verb = ast.verb;
      let text: string;
      switch (verb.type) {
        case "linking noun":
          text = noun(verb.noun, 0);
          break;
        case "linking adjective":
          text = adjective(verb.adjective, 0);
          break;
      }
      return [text!, ...verb.preposition.map(preposition)].join(" ");
    }
    case "subject phrase":
      return noun(ast.subject, 0);
    case "vocative":
      return `${ast.call} ${noun(ast.addressee, 0)}`;
    case "dependent":
      return `${word(ast.conjunction)} ${clause(ast.clause)}`;
    default:
      throw new TodoError(`composing ${ast.type}`);
  }
}
function sentence(sentence: Sentence): string {
  return `${sentence.clauses.map(clause).join(", ")}${sentence.punctuation}`;
}
export function translate(src: string): Output<string> {
  return translateToAst(src)
    .map((sentences) => sentences.map(sentence).join(" "));
}
