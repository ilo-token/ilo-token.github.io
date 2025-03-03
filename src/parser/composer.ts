import { nullableAsArray, repeatWithSpace } from "../misc.ts";
import {
  Clause,
  ContextClause,
  Emphasis,
  Filler,
  Modifier,
  MultiplePhrases,
  MultipleSentences,
  Nanpa,
  Phrase,
  Predicate,
  Preposition,
  Quotation,
  Sentence,
  SimpleWordUnit,
  WordUnit,
} from "./ast.ts";

export function emphasis(emphasis: Emphasis): string {
  switch (emphasis.type) {
    case "word":
      return emphasis.word;
    case "long word":
      return emphasis.word.repeat(emphasis.length);
  }
}
export function filler(filler: Filler): string {
  switch (filler.type) {
    case "multiple a":
      return repeatWithSpace("a", filler.count);
    default:
      return emphasis(filler);
  }
}
function emphasisAsArray(value: null | Emphasis): Array<string> {
  return nullableAsArray(value).map(emphasis);
}
export function simpleWordUnit(wordUnit: SimpleWordUnit): string {
  switch (wordUnit.type) {
    case "number":
      return wordUnit.words.join(" ");
    case "default":
      return wordUnit.word;
    case "x ala x":
      return `${wordUnit.word} ala ${wordUnit.word}`;
    case "reduplication":
      return repeatWithSpace(wordUnit.word, wordUnit.count);
  }
}
export function wordUnit(wordUnit: WordUnit): string {
  return [
    simpleWordUnit(wordUnit),
    ...emphasisAsArray(wordUnit.emphasis),
  ]
    .join(" ");
}
export function nanpa(nanpa: Nanpa): string {
  return `${wordUnit(nanpa.nanpa)} ${phrase(nanpa.phrase)}`;
}
export function modifier(modifier: Modifier): string {
  switch (modifier.type) {
    case "default":
      return wordUnit(modifier.word);
    case "proper words":
      return modifier.words;
    case "pi":
      return `pi ${phrase(modifier.phrase)}`;
    case "nanpa":
      return nanpa(modifier);
    case "quotation":
      return quotation(modifier);
  }
}
export function phrase(value: Phrase): string {
  switch (value.type) {
    case "default":
      return [
        wordUnit(value.headWord),
        ...value.modifiers.map(modifier),
        ...emphasisAsArray(value.emphasis),
      ]
        .join(" ");
    case "preverb":
      return [
        wordUnit(value.preverb),
        ...value.modifiers.map(modifier),
        phrase(value.phrase),
        ...emphasisAsArray(value.emphasis),
      ]
        .join(" ");
    case "preposition":
      return preposition(value);
    case "quotation":
      return quotation(value);
  }
}
function particle(type: "and conjunction" | "anu", particle: string): string {
  if (type === "and conjunction") {
    return particle;
  } else {
    return "anu;";
  }
}
export function multiplePhrases(
  phrases: MultiplePhrases,
  andParticle: string,
): string {
  switch (phrases.type) {
    case "single":
      return phrase(phrases.phrase);
    case "and conjunction":
    case "anu": {
      return phrases.phrases
        .map((phrases) => multiplePhrases(phrases, andParticle))
        .join(` ${particle(phrases.type, andParticle)} `);
    }
  }
}
export function preposition(preposition: Preposition): string {
  return [
    wordUnit(preposition.preposition),
    ...preposition.modifiers.map(modifier),
    multiplePhrases(preposition.phrases, ""),
    ...emphasisAsArray(preposition.emphasis),
  ]
    .join(" ");
}
export function multiplePredicates(
  predicates: Predicate,
  andParticle: string,
): string {
  switch (predicates.type) {
    case "single":
      return phrase(predicates.predicate);
    case "associated": {
      return [
        multiplePhrases(predicates.predicates, andParticle),
        ...nullableAsArray(predicates.objects).map((_) => "e"),
        ...nullableAsArray(predicates.objects)
          .map((objects) => multiplePhrases(objects, "e")),
        ...predicates.prepositions.map(preposition),
      ]
        .join(" ");
    }
    case "and conjunction":
    case "anu":
      return predicates.predicates
        .map((predicates) => multiplePredicates(predicates, andParticle))
        .join(` ${particle(predicates.type, andParticle)} `);
  }
}
export function clause(clause: Clause): string {
  switch (clause.type) {
    case "phrases":
      return multiplePhrases(clause.phrases, "en");
    case "o vocative":
      return `${multiplePhrases(clause.phrases, "en")} o`;
    case "li clause": {
      let li: Array<string>;
      if (clause.explicitLi) {
        li = ["li"];
      } else {
        li = [];
      }
      return [
        multiplePhrases(clause.subjects, "en"),
        ...li,
        multiplePredicates(clause.predicates, "li"),
      ]
        .join(" ");
    }
    case "o clause":
      return [
        ...nullableAsArray(clause.subjects)
          .map((subjects) => multiplePhrases(subjects, "en")),
        "o",
        multiplePredicates(clause.predicates, "o"),
      ]
        .join(" ");
    case "prepositions":
      return clause.prepositions.map(preposition).join(" ");
    case "quotation":
      throw new Error();
  }
}
export function contextClause(contextClause: ContextClause): string {
  switch (contextClause.type) {
    case "nanpa":
      return nanpa(contextClause);
    default:
      return clause(contextClause);
  }
}
export function sentence(sentence: Sentence): string {
  let text: string;
  switch (sentence.type) {
    case "default":
      text = [
        ...nullableAsArray(sentence.kinOrTaso).map(wordUnit),
        ...sentence.laClauses
          .map(contextClause)
          .map((clause) => `${clause} la`),
        clause(sentence.finalClause),
        ...nullableAsArray(sentence.anuSeme)
          .map(wordUnit)
          .map((word) => `anu ${word}`),
        ...emphasisAsArray(sentence.emphasis),
      ]
        .join(" ");
      break;
    case "filler":
      text = filler(sentence.filler);
      break;
  }
  return `${text}${sentence.punctuation}`;
}
export function quotation(quotation: Quotation): string {
  const text = quotation.sentences.map(sentence).join(" ");
  return `${quotation.leftMark}${text}${quotation.rightMark}`;
}
export function multipleSentences(sentences: MultipleSentences): string {
  switch (sentences.type) {
    case "single word":
      return sentences.word;
    case "sentences":
      return sentences.sentences.map(sentence).join(" ");
  }
}
