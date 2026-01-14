import * as Dictionary from "../../dictionary/type.ts";

export type Word = Readonly<{
  word: string;
  emphasis: boolean;
}>;
export type Quantity = "singular" | "plural" | "condensed";
export type AdjectiveName = Readonly<{ adjective: string; name: string }>;
export type Determiner =
  & Dictionary.Determiner
  & Readonly<{
    reduplicationCount: number;
    emphasis: boolean;
  }>;
export type SimpleNounPhrase =
  & Dictionary.PronounForms
  & Readonly<{
    determiners: ReadonlyArray<Determiner>;
    adjectives: ReadonlyArray<AdjectivePhrase>;
    reduplicationCount: number;
    wordEmphasis: boolean;
    perspective: Dictionary.Perspective;
    adjectiveName: null | AdjectiveName;
    postCompound: null | NounPhrase;
    prepositions: ReadonlyArray<Preposition>;
    phraseEmphasis: boolean;
  }>;
export type NounPhrase =
  | (SimpleNounPhrase & Readonly<{ type: "simple" }>)
  | Readonly<{
    type: "compound";
    conjunction: string;
    nouns: ReadonlyArray<NounPhrase>;
  }>;
export type AdjectivePhrase =
  | Readonly<{
    type: "simple";
    kind: Dictionary.AdjectiveType;
    adverbs: ReadonlyArray<Adverb>;
    adjective: Word;
    emphasis: boolean;
  }>
  | Readonly<{
    type: "compound";
    conjunction: string;
    adjectives: ReadonlyArray<AdjectivePhrase>;
  }>;
export type Complement =
  | Readonly<{ type: "noun"; noun: NounPhrase }>
  | Readonly<{ type: "adjective"; adjective: AdjectivePhrase }>;
export type Adverb = Readonly<{
  adverb: Word;
  negative: boolean;
}>;
export type Verb =
  | (
    & Dictionary.VerbForms
    & Readonly<{
      type: "non-modal";
      reduplicationCount: number;
      emphasis: boolean;
    }>
  )
  | (Word & Readonly<{ type: "modal" }>);
export type AdverbVerb = Readonly<{
  preAdverbs: ReadonlyArray<Adverb>;
  verb: Verb;
  postAdverb: null | Adverb;
}>;
export type SimpleVerbPhrase = Readonly<{
  verb: ReadonlyArray<AdverbVerb>;
  subjectComplement: null | Complement;
  contentClause: null | Clause;
  object: null | NounPhrase;
  objectComplement: null | Complement;
  forObject: boolean | string;
  predicateType: null | "verb" | "noun adjective";
  prepositions: ReadonlyArray<Preposition>;
  hideVerb: boolean;
  emphasis: boolean;
}>;
export type VerbPhrase =
  | (SimpleVerbPhrase & Readonly<{ type: "simple" }>)
  | Readonly<{
    type: "compound";
    conjunction: string;
    verbs: ReadonlyArray<VerbPhrase>;
    object: null | NounPhrase;
    objectComplement: null | Complement;
    prepositions: ReadonlyArray<Preposition>;
  }>;
export type Clause =
  | Readonly<{
    type: "simple";
    subject: NounPhrase;
    verb: VerbPhrase;
    hideSubject: boolean;
  }>
  | Readonly<{ type: "subject phrase"; subject: NounPhrase }>
  | Readonly<{ type: "interjection"; interjection: Word }>
  | Readonly<{ type: "vocative"; call: string; addressee: NounPhrase }>
  | (Readonly<{ type: "preposition" }> & Preposition)
  | Readonly<{ type: "adverb"; adverb: Word }>
  | Readonly<{ type: "dependent"; conjunction: Word; clause: Clause }>;
export type Preposition = Readonly<{
  adverbs: ReadonlyArray<Adverb>;
  preposition: Word;
  object: NounPhrase;
  emphasis: boolean;
}>;
export type Sentence = Readonly<{
  clauses: ReadonlyArray<Clause>;
  punctuation: string;
}>;
export type MultipleSentences =
  | Readonly<{ type: "free form"; text: string }>
  | Readonly<{ type: "sentences"; sentences: ReadonlyArray<Sentence> }>;
