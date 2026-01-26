import { nullableAsArray } from "../misc.ts";
import {
  Clause,
  ContextClause,
  Modifier,
  MultiplePhrases,
  Nanpa,
  Phrase,
  Predicate,
  Preposition,
  Sentence,
  WordUnit,
} from "./ast.ts";

export function everyWordUnitInNanpa(nanpa: Nanpa): ReadonlyArray<WordUnit> {
  return [nanpa.nanpa, ...everyWordUnitInPhrase(nanpa.phrase)];
}
export function everyWordUnitInModifier(
  modifier: Modifier,
): ReadonlyArray<WordUnit> {
  switch (modifier.type) {
    case "simple":
      return [modifier.word];
    case "pi":
      return everyWordUnitInPhrase(modifier.phrase);
    case "nanpa":
      return everyWordUnitInNanpa(modifier);
    case "name":
      return [];
  }
}
export function everyWordUnitInPhrase(phrase: Phrase): ReadonlyArray<WordUnit> {
  switch (phrase.type) {
    case "simple":
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
  }
}
export function everyWordUnitInMultiplePhrases(
  phrase: MultiplePhrases,
): ReadonlyArray<WordUnit> {
  return everyPhraseInMultiplePhrases(phrase).flatMap(everyWordUnitInPhrase);
}
export function everyWordUnitInPreposition(
  preposition: Preposition,
): ReadonlyArray<WordUnit> {
  return [
    preposition.preposition,
    ...preposition.modifiers.flatMap(everyWordUnitInModifier),
    ...everyWordUnitInMultiplePhrases(preposition.phrases),
  ];
}
export function everyWordUnitInMultiplePredicates(
  predicate: Predicate,
): ReadonlyArray<WordUnit> {
  switch (predicate.type) {
    case "simple":
      return everyWordUnitInPhrase(predicate.predicate);
    case "associated":
      return [
        ...everyWordUnitInMultiplePhrases(predicate.predicates),
        ...nullableAsArray(predicate.objects)
          .flatMap(everyWordUnitInMultiplePhrases),
        ...predicate.prepositions.flatMap(everyWordUnitInPreposition),
      ];
    case "and":
    case "anu":
      return predicate.predicates.flatMap(everyWordUnitInMultiplePredicates);
  }
}
export function everyWordUnitInClause(clause: Clause): ReadonlyArray<WordUnit> {
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
  }
}
export function everyWordUnitInContextClause(
  contextClause: ContextClause,
): ReadonlyArray<WordUnit> {
  switch (contextClause.type) {
    case "prepositions":
      return contextClause.prepositions.flatMap(everyWordUnitInPreposition);
    case "nanpa":
      return everyWordUnitInNanpa(contextClause);
    case "anu":
      return [contextClause.anu];
    default:
      return everyWordUnitInClause(contextClause);
  }
}
export function everyWordUnitInSentence(
  sentence: Sentence,
): ReadonlyArray<WordUnit> {
  switch (sentence.type) {
    case "simple":
      return [
        ...nullableAsArray(sentence.startingParticle),
        ...sentence.contextClauses.flatMap(everyWordUnitInContextClause),
        ...everyWordUnitInClause(sentence.finalClause),
        ...nullableAsArray(sentence.anuSeme),
      ];
    case "filler":
      return [];
  }
}
export function everyModifierInPhrase(phrase: Phrase): ReadonlyArray<Modifier> {
  switch (phrase.type) {
    case "simple":
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
  }
}
export function everyModifierInMultiplePhrases(
  phrases: MultiplePhrases,
): ReadonlyArray<Modifier> {
  return everyPhraseInMultiplePhrases(phrases).flatMap(everyModifierInPhrase);
}
export function everyPhraseInMultiplePhrases(
  phrases: MultiplePhrases,
): ReadonlyArray<Phrase> {
  switch (phrases.type) {
    case "simple":
      return [phrases.phrase];
    case "and":
    case "anu":
      return phrases.phrases.flatMap(everyPhraseInMultiplePhrases);
  }
}
export function everyObjectInMultiplePredicates(
  predicates: Predicate,
): ReadonlyArray<Phrase> {
  switch (predicates.type) {
    case "simple":
      return [];
    case "associated":
      return nullableAsArray(predicates.objects)
        .flatMap(everyPhraseInMultiplePhrases);
    case "and":
    case "anu":
      return predicates.predicates.flatMap(everyObjectInMultiplePredicates);
  }
}
