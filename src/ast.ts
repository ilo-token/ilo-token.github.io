/** Module for describing Toki Pona AST. */

import { nullableAsArray } from "./misc.ts";

/** Represents an emphasis particle. */
export type Emphasis =
  | { type: "word"; word: string }
  | { type: "long word"; word: string; length: number }
  | { type: "multiple a"; count: number };
export type SimpleHeadedWordUnit =
  | { type: "default"; word: string }
  | { type: "x ala x"; word: string }
  | { type: "reduplication"; word: string; count: number };
export type SimpleWordUnit =
  | SimpleHeadedWordUnit
  | { type: "number"; number: number };
export type HeadedWordUnit =
  & SimpleHeadedWordUnit
  & { emphasis: null | Emphasis };
/** Represents a word unit. */
export type WordUnit =
  & SimpleWordUnit
  & { emphasis: null | Emphasis };
/** Represents a single modifier. */
export type Modifier =
  | { type: "default"; word: WordUnit }
  | { type: "proper words"; words: string }
  | { type: "pi"; phrase: Phrase }
  | { type: "nanpa"; nanpa: WordUnit; phrase: Phrase }
  | ({ type: "quotation" } & Quotation);
/**
 * Represents a phrase including preverbial phrases, quotations, and
 * prepositional phrases intended for predicate.
 */
export type Phrase =
  | {
    type: "default";
    headWord: WordUnit;
    modifiers: Array<Modifier>;
    emphasis: null | Emphasis;
  }
  | {
    type: "preverb";
    preverb: HeadedWordUnit;
    modifiers: Array<Modifier>;
    phrase: Phrase;
    emphasis: null | Emphasis;
  }
  | ({ type: "preposition" } & Preposition)
  | ({ type: "quotation" } & Quotation);
/** Represents multiple phrases separated by repeated particle or "anu". */
export type MultiplePhrases =
  | { type: "single"; phrase: Phrase }
  | { type: "and conjunction"; phrases: Array<MultiplePhrases> }
  | { type: "anu"; phrases: Array<MultiplePhrases> };
/** Represents a single prepositional phrase. */
export type Preposition = {
  preposition: HeadedWordUnit;
  modifiers: Array<Modifier>;
  phrases: MultiplePhrases & { type: "single" | "anu" };
  emphasis: null | Emphasis;
};
/** Represents multiple predicates. */
export type MultiplePredicates =
  | { type: "single"; predicate: Phrase }
  | {
    type: "associated";
    predicates: MultiplePhrases;
    objects: null | MultiplePhrases;
    prepositions: Array<Preposition>;
  }
  | { type: "and conjunction"; predicates: Array<MultiplePredicates> }
  | { type: "anu"; predicates: Array<MultiplePredicates> };
/** Represents a simple clause. */
export type Clause =
  | { type: "phrases"; phrases: MultiplePhrases }
  | { type: "o vocative"; phrases: MultiplePhrases }
  | {
    type: "li clause";
    subjects: MultiplePhrases;
    predicates: MultiplePredicates;
    explicitLi: boolean;
  }
  | {
    type: "o clause";
    subjects: null | MultiplePhrases;
    predicates: MultiplePredicates;
  }
  | { type: "prepositions"; prepositions: Array<Preposition> }
  | ({ type: "quotation" } & Quotation);
/** Represents a clause including preclauses and postclauses. */
export type FullClause =
  | {
    type: "default";
    startingParticle: null | Emphasis;
    kinOrTaso: null | HeadedWordUnit;
    clause: Clause;
    anuSeme: null | HeadedWordUnit;
    endingParticle: null | Emphasis;
  }
  | { type: "filler"; emphasis: Emphasis };
/** Represents a single full sentence. */
export type Sentence = {
  laClauses: Array<FullClause>;
  finalClause: FullClause;
  interrogative: null | "seme" | "x ala x";
  punctuation: string;
};
/** Represents quotation. */
export type Quotation = {
  sentences: Array<Sentence>;
  leftMark: string;
  rightMark: string;
};
/** The final representation of whole Toki Pona input text. */
export type MultipleSentences =
  | { type: "single word"; word: string }
  | { type: "sentences"; sentences: Array<Sentence> };

function everyWordUnitInModifier(modifier: Modifier): Array<WordUnit> {
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
function everyWordUnitInPhrase(phrase: Phrase): Array<WordUnit> {
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
function everyWordUnitInMultiplePhrases(
  phrase: MultiplePhrases,
): Array<WordUnit> {
  return everyPhraseInMultiplePhrases(phrase).flatMap(everyWordUnitInPhrase);
}
function everyWordUnitInPreposition(preposition: Preposition): Array<WordUnit> {
  return [
    preposition.preposition,
    ...preposition.modifiers.flatMap(everyWordUnitInModifier),
    ...everyWordUnitInMultiplePhrases(preposition.phrases),
  ];
}
function everyWordUnitInMultiplePredicates(
  predicate: MultiplePredicates,
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
function everyWordUnitInClause(clause: Clause): Array<WordUnit> {
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
  predicates: MultiplePredicates,
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
