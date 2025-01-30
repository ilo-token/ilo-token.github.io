import {
  AdjectivePhrase,
  Clause,
  NounPhrase,
  Preposition,
  Sentence,
  Word,
} from "./english-ast.ts";
import { TodoError } from "./error.ts";
import { fs, join, nullableAsArray } from "./misc.ts";
import { Output, OutputError } from "./output.ts";
import { translate as translateToAst } from "./translator.ts";

const emphasisStartingTag = "<b>";
const emphasisEndingTag = "</b>";

function word(word: Word): string {
  if (word.emphasis) {
    return fs`${emphasisStartingTag}${word.word}${emphasisEndingTag}`;
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
    return join(elements, fs` ${conjunction} `);
  } else {
    const lastIndex = elements.length - 1;
    const init = elements.slice(0, lastIndex);
    const last = elements[lastIndex];
    return fs`${join(init, ", ")} ${conjunction} ${last}`;
  }
}
function noun(phrases: NounPhrase, depth: number): string {
  switch (phrases.type) {
    case "simple": {
      const text = join(
        [
          ...phrases.determiner.map((determiner) =>
            word(determiner.determiner)
          ),
          ...phrases.adjective.map(adjective),
          word(phrases.noun),
          ...nullableAsArray(phrases.postCompound).map(noun),
          ...nullableAsArray(phrases.postAdjective)
            .map((adjective) => fs`${adjective.adjective} ${adjective.name}`),
          ...phrases.preposition.map(preposition),
        ],
        " ",
      );
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
      text = join([...phrases.adverb.map(word), word(phrases.adjective)], " ");
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
  return fs`${word(preposition.preposition)} ${noun(preposition.object, 0)}`;
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
      return join([text!, ...verb.preposition.map(preposition)], " ");
    }
    case "subject phrase":
      return noun(ast.subject, 0);
    case "vocative":
      return fs`${ast.call} ${noun(ast.addressee, 0)}`;
    case "dependent":
      return fs`${word(ast.conjunction)} ${clause(ast.clause)}`;
    default:
      throw new TodoError(fs`composing ${ast.type}`);
  }
}
function sentence(sentence: Sentence): string {
  return fs`${join(sentence.clauses.map(clause), ", ")}${sentence.punctuation}`;
}
export function translate(src: string): Output<string> {
  try {
    return translateToAst(src)
      .map((sentences) => join(sentences.map(sentence), " "));
  } catch (error) {
    if (error instanceof OutputError) {
      return new Output(error);
    } else {
      throw error;
    }
  }
}
