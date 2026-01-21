import { nullableAsArray, repeatWithSpace } from "../misc/misc.ts";
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
    case "reduplicated a":
      return repeatWithSpace("a", filler.count);
    default:
      return emphasis(filler);
  }
}
function emphasisAsArray(value: null | Emphasis) {
  return nullableAsArray(value).map(emphasis);
}
export function simpleWordUnit(wordUnit: SimpleWordUnit): string {
  switch (wordUnit.type) {
    case "number":
      return wordUnit.words.join(" ");
    case "simple":
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
    case "simple":
      return wordUnit(modifier.word);
    case "name":
      return modifier.words;
    case "pi":
      return `pi ${phrase(modifier.phrase)}`;
    case "nanpa":
      return nanpa(modifier);
  }
}
export function phrase(value: Phrase): string {
  switch (value.type) {
    case "simple":
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
  }
}
export function multiplePhrases(phrases: MultiplePhrases): string {
  switch (phrases.type) {
    case "simple":
      return phrase(phrases.phrase);
    case "and":
    case "anu": {
      return phrases.phrases
        .map((phrases) => multiplePhrases(phrases))
        .join(` ${phrases.particle} `);
    }
  }
}
export function preposition(preposition: Preposition): string {
  return [
    wordUnit(preposition.preposition),
    ...preposition.modifiers.map(modifier),
    multiplePhrases(preposition.phrases),
    ...emphasisAsArray(preposition.emphasis),
  ]
    .join(" ");
}
export function multiplePredicates(
  predicates: Predicate,
): string {
  switch (predicates.type) {
    case "simple":
      return phrase(predicates.predicate);
    case "associated": {
      return [
        multiplePhrases(predicates.predicates),
        ...nullableAsArray(predicates.objects).map(() => "e"),
        ...nullableAsArray(predicates.objects)
          .map((objects) => multiplePhrases(objects)),
        ...predicates.prepositions.map(preposition),
      ]
        .join(" ");
    }
    case "and":
    case "anu":
      return predicates.predicates
        .map((predicates) => multiplePredicates(predicates))
        .join(` ${predicates.particle} `);
  }
}
export function clause(clause: Clause): string {
  switch (clause.type) {
    case "phrases":
      return multiplePhrases(clause.phrases);
    case "o vocative":
      return `${multiplePhrases(clause.phrases)} o`;
    case "li clause": {
      const li = clause.explicitLi ? ["li"] : [];
      return [
        multiplePhrases(clause.subjects),
        ...li,
        multiplePredicates(clause.predicates),
      ]
        .join(" ");
    }
    case "o clause":
      return [
        ...nullableAsArray(clause.subjects)
          .map((subjects) => multiplePhrases(subjects)),
        "o",
        multiplePredicates(clause.predicates),
      ]
        .join(" ");
  }
}
export function contextClause(contextClause: ContextClause): string {
  switch (contextClause.type) {
    case "prepositions":
      return contextClause.prepositions.map(preposition).join(" ");
    case "nanpa":
      return nanpa(contextClause);
    case "anu":
      return wordUnit(contextClause.anu);
    default:
      return clause(contextClause);
  }
}
export function sentence(sentence: Sentence): string {
  let text: string;
  switch (sentence.type) {
    case "simple":
      text = [
        ...nullableAsArray(sentence.startingParticle).map(wordUnit),
        ...sentence.contextClauses
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
export function multipleSentences(sentences: MultipleSentences): string {
  switch (sentences.type) {
    case "single word":
      return sentences.word;
    case "sentences":
      return sentences.sentences.map(sentence).join(" ");
  }
}
