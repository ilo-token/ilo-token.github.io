/** Module for describing English AST. */

/** */
export type Quantity = "zero" | "singular" | "plural" | "both" | "condensed";
export type NounPhrase =
  | {
    type: "simple";
    determiners: Array<Determiner>;
    adjectives: Array<AdjectivePhrase>;
    noun: string;
    quantity: Quantity;
    preposition: Array<Preposition>;
  }
  | {
    type: "compound";
    conjunction: string;
    nouns: Array<NounPhrase>;
    quantity: Quantity;
    preposition: Array<Preposition>;
  };
export type DeterminerType =
  | "article"
  | "demonstrative"
  | "distributive"
  | "interrogative"
  | "possessive"
  | "quantifier"
  | "relative";
export type Determiner =
  | {
    type: "default";
    kind: DeterminerType;
    word: string;
    quantity: Quantity;
  }
  | { type: "numeral"; number: number };
export type AdjectiveType =
  | "opinion"
  | "size"
  | "physical quality"
  | "age"
  | "color"
  | "origin"
  | "material"
  | "qualifier";
export type AdjectivePhrase =
  | {
    type: "simple";
    kind: AdjectiveType;
    adverbs: Array<string>;
    adjective: string;
  }
  | {
    type: "compound";
    conjunction: string;
    adjectives: Array<AdjectivePhrase>;
  };
export type VerbPhrase =
  | {
    type: "default";
    adverbs: Array<string>;
    verb: string;
    preposition: Array<Preposition>;
  }
  | {
    type: "linking noun";
    linkingVerb: string;
    noun: NounPhrase;
    preposition: Array<Preposition>;
  }
  | {
    type: "linking adjective";
    linkingVerb: string;
    adjective: AdjectivePhrase;
    preposition: Array<Preposition>;
  }
  | {
    type: "compound";
    conjunction: string;
    verbs: VerbPhrase;
    preposition: Array<Preposition>;
  };
export type Clause =
  | { type: "free form"; text: string }
  | {
    type: "default";
    subject: NounPhrase;
    verb: VerbPhrase;
    object: null | NounPhrase;
    preposition: Array<Preposition>;
  }
  | { type: "subject phrase"; subject: NounPhrase }
  | {
    type: "implied it's";
    verb: VerbPhrase;
    preposition: Array<Preposition>;
  }
  | { type: "interjection"; interjection: string }
  | { type: "vocative"; call: string; addressee: NounPhrase }
  | {
    type: "compound";
    conjunction: string;
    clauses: Array<Clause>;
    preposition: Array<Preposition>;
  }
  | { type: "dependent"; conjunction: string; clause: Clause };
export type Preposition = {
  preposition: string;
  object: NounPhrase;
};
export type Sentence = {
  clauses: Array<Clause>;
  punctuation: string;
};
