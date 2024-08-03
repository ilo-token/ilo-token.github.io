export type Noun = {
  determiner: Array<Determiner>;
  adjective: Array<Adjective>;
  singular: null | string;
  plural: null | string;
  condensed: string;
};
export type DeterminerType =
  | "article"
  | "demonstrative"
  | "distributive"
  | "interrogative"
  | "possessive"
  | "quantifier"
  | "relative";
export type Quantity = "singular" | "plural" | "both";
export type Determiner = {
  determiner: string;
  kind: DeterminerType;
  number: Quantity;
};
export type AdjectiveType =
  | "opinion"
  | "size"
  | "physical quality"
  | "age"
  | "color"
  | "origin"
  | "material"
  | "qualifier";
export type Adjective = {
  adverb: Array<string>;
  adjective: string;
  kind: AdjectiveType;
};
export type Definition =
  | { type: "filler"; before: string; repeat: string; after: string }
  | { type: "particle"; definition: string }
  | ({ type: "noun" } & Noun)
  | {
    type: "noun preposition";
    noun: Noun;
    preposition: string;
  }
  | {
    type: "personal pronoun";
    singular: null | { subject: string; object: string };
    plural: null | { subject: string; object: string };
  }
  | ({ type: "determiner" } & Determiner)
  | {
    type: "quantified determiner";
    singular: string;
    plural: string;
    condensed: string;
    kind: DeterminerType;
    number: Quantity;
  }
  | { type: "numeral"; numeral: number }
  | ({ type: "adjective" } & Adjective)
  | { type: "compound adjective"; adjective: Array<Adjective> }
  | { type: "adverb"; adverb: string }
  | {
    type: "verb";
    presentSingular: string;
    presentPlural: string;
    past: string;
    condensed: string;
    preposition: null | string;
    object: null | Noun;
    forObject: boolean | string;
  }
  | { type: "preposition"; preposition: string }
  | { type: "preposition object"; preposition: string; object: Noun }
  | { type: "interjection"; interjection: string }
  | { type: "adhoc"; definition: string };
export type Dictionary = { [word: string]: Array<Definition> };
