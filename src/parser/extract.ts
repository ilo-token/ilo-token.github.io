import { nullableAsArray } from "../misc.ts";
import {
  Clause,
  FullClause,
  Modifier,
  MultiplePhrases,
  Phrase,
  Predicate,
  Preposition,
  Sentence,
  WordUnit,
} from "./ast.ts";

export function everyWordUnitInModifier(modifier: Modifier): Array<WordUnit> {
  switch (modifier.type) {
    case "default":
      return [modifier.word];
    case "pi":
      return everyWordUnitInPhrase(modifier.phrase);
    case "nanpa":
      return [modifier.nanpa, ...everyWordUnitInPhrase(modifier.phrase)];
    case "quotation":
    case "proper words":
      return [];
  }
}
export function everyWordUnitInPhrase(phrase: Phrase): Array<WordUnit> {
  switch (phrase.type) {
    case "default":
      return [
        phrase.headWord,
        ...phrase.modifiers.flatMap(everyWordUnitInModifier),
      ];
    case "preverb":
      return [
        phrase.preverb,
        ...phrase.modifiers.flatMap(everyWordUnitInModifier),
        ...everyWordUnitInPhrase(phrase.phrase),
      ];
    case "preposition":
      return everyWordUnitInPreposition(phrase);
    case "quotation":
      return [];
  }
}
export function everyWordUnitInMultiplePhrases(
  phrase: MultiplePhrases,
): Array<WordUnit> {
  return everyPhraseInMultiplePhrases(phrase).flatMap(everyWordUnitInPhrase);
}
export function everyWordUnitInPreposition(
  preposition: Preposition,
): Array<WordUnit> {
  return [
    preposition.preposition,
    ...preposition.modifiers.flatMap(everyWordUnitInModifier),
    ...everyWordUnitInMultiplePhrases(preposition.phrases),
  ];
}
export function everyWordUnitInMultiplePredicates(
  predicate: Predicate,
): Array<WordUnit> {
  switch (predicate.type) {
    case "single":
      return everyWordUnitInPhrase(predicate.predicate);
    case "associated":
      return [
        ...everyWordUnitInMultiplePhrases(predicate.predicates),
        ...nullableAsArray(predicate.objects)
          .flatMap(everyWordUnitInMultiplePhrases),
        ...predicate.prepositions.flatMap(everyWordUnitInPreposition),
      ];
    case "and conjunction":
    case "anu":
      return predicate.predicates.flatMap(everyWordUnitInMultiplePredicates);
  }
}
export function everyWordUnitInClause(clause: Clause): Array<WordUnit> {
  switch (clause.type) {
    case "phrases":
    case "o vocative":
      return everyWordUnitInMultiplePhrases(clause.phrases);
    case "li clause":
      return [
        ...everyWordUnitInMultiplePhrases(clause.subjects),
        ...everyWordUnitInMultiplePredicates(clause.predicates),
      ];
    case "o clause":
      return [
        ...nullableAsArray(clause.subjects)
          .flatMap(everyWordUnitInMultiplePhrases),
        ...everyWordUnitInMultiplePredicates(clause.predicates),
      ];
    case "prepositions":
      return clause.prepositions.flatMap(everyWordUnitInPreposition);
    case "quotation":
      return [];
  }
}
export function everyWordUnitInFullClause(clause: FullClause): Array<WordUnit> {
  switch (clause.type) {
    case "default":
      return [
        ...nullableAsArray(clause.kinOrTaso),
        ...everyWordUnitInClause(clause.clause),
        ...nullableAsArray(clause.anuSeme),
      ];
    case "filler":
      return [];
  }
}
export function everyWordUnitInSentence(sentence: Sentence): Array<WordUnit> {
  return [...sentence.laClauses, sentence.finalClause]
    .flatMap(everyWordUnitInFullClause);
}
export function everyModifierInPhrase(phrase: Phrase): Array<Modifier> {
  switch (phrase.type) {
    case "default":
      return phrase.modifiers;
    case "preverb":
      return [
        ...phrase.modifiers,
        ...everyModifierInPhrase(phrase.phrase),
      ];
    case "preposition":
      return [
        ...phrase.modifiers,
        ...everyModifierInMultiplePhrases(phrase.phrases),
      ];
    case "quotation":
      return [];
  }
}
export function everyModifierInMultiplePhrases(
  phrases: MultiplePhrases,
): Array<Modifier> {
  return everyPhraseInMultiplePhrases(phrases).flatMap(everyModifierInPhrase);
}
export function everyPhraseInMultiplePhrases(
  phrases: MultiplePhrases,
): Array<Phrase> {
  switch (phrases.type) {
    case "single":
      return [phrases.phrase];
    case "and conjunction":
    case "anu":
      return phrases.phrases.flatMap(everyPhraseInMultiplePhrases);
  }
}
export function everyObjectInMultiplePredicates(
  predicates: Predicate,
): Array<Phrase> {
  switch (predicates.type) {
    case "single":
      return [];
    case "associated":
      return nullableAsArray(predicates.objects)
        .flatMap(everyPhraseInMultiplePhrases);
    case "and conjunction":
    case "anu":
      return predicates.predicates.flatMap(everyObjectInMultiplePredicates);
  }
}
