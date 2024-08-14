import {
  AdjectivePhrase,
  Clause,
  NounPhrase,
  Preposition,
  Sentence,
  Word,
} from "./english-ast.ts";
import { TodoError } from "./error.ts";
import { nullableAsArray } from "./misc.ts";
import { Output, OutputError } from "./output.ts";
import { translate as translateToAst } from "./translator.ts";

const emphasisStartingTag = "<b>";
const emphasisEndingTag = "</b>";

function word(word: Word): string {
  if (word.emphasis) {
    return `${emphasisStartingTag}${word.word}${emphasisEndingTag}`;
  } else {
    return word.word;
  }
}
function compound(elements: Array<string>, conjunction: string): string {
  if (elements.length === 2) {
    return `${elements[0]} ${conjunction} ${elements[1]}`;
  } else {
    const lastIndex = elements.length - 1;
    const init = elements.slice(0, lastIndex);
    const last = elements[lastIndex];
    return `${init.join(", ")} ${conjunction} ${last}`;
  }
}
function noun(phrases: NounPhrase): string {
  switch (phrases.type) {
    case "simple":
      return [
        ...phrases.determiner.map((determiner) => word(determiner.determiner)),
        ...phrases.adjective.map(adjective),
        word(phrases.noun),
        ...nullableAsArray(phrases.postCompound).map(noun),
        ...nullableAsArray(phrases.postAdjective)
          .map((adjective) => `${adjective.adjective} ${adjective.name}`),
        ...phrases.preposition.map(preposition),
      ].join(" ");
    case "compound":
      return compound(phrases.nouns.map(noun), phrases.conjunction);
  }
}
function adjective(phrases: AdjectivePhrase): string {
  let text: string;
  switch (phrases.type) {
    case "simple":
      text = [...phrases.adverb.map(word), word(phrases.adjective)].join(
        " ",
      );
      break;
    case "compound":
      text = compound(phrases.adjective.map(adjective), phrases.conjunction);
  }
  return word({ word: text, emphasis: phrases.emphasis });
}
function preposition(preposition: Preposition): string {
  return `${preposition.preposition} ${noun(preposition.object)}`;
}
function clause(clause: Clause): string {
  switch (clause.type) {
    case "free form":
      return clause.text;
    case "interjection":
      return word(clause.interjection);
    case "implied it's": {
      const verb = clause.verb;
      let text: string;
      switch (verb.type) {
        case "linking noun":
          text = noun(verb.noun);
          break;
        case "linking adjective":
          text = adjective(verb.adjective);
          break;
      }
      return [text!, verb.preposition.map(preposition)].join(" ");
    }
    // unreachable
    // fallthrough
    default:
      throw new TodoError(`composing ${clause.type}`);
  }
}
function sentence(sentence: Sentence): string {
  return `${sentence.clauses.map(clause).join(", ")}${sentence.punctuation}`;
}
export function translate(src: string): Output<string> {
  try {
    return translateToAst(src)
      .map((sentences) => sentences.map(sentence).join(" "));
  } catch (error) {
    if (error instanceof OutputError) {
      return new Output(error);
    } else {
      throw error;
    }
  }
}
