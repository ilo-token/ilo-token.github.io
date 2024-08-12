export type Noun = {
  determiner: Array<Determiner>;
  adjective: Array<Adjective>;
  singular: null | string;
  plural: null | string;
  gerund: boolean;
};
export type DeterminerType =
  | "article"
  | "demonstrative"
  | "distributive"
  | "interrogative"
  | "possessive"
  | "quantifier"
  | "negative";
export type Quantity = "singular" | "plural" | "both";
export type Determiner = {
  determiner: string;
  plural: null | string;
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
  | { type: "particle definition"; definition: string }
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
  | { type: "numeral"; numeral: number }
  | ({ type: "adjective" } & Adjective)
  | { type: "compound adjective"; adjective: Array<Adjective> }
  | { type: "adverb"; adverb: string }
  | {
    type: "verb";
    presentSingular: string;
    presentPlural: string;
    past: string;
    directObject: null | Noun;
    indirectObject: Array<{
      preposition: string;
      object: Noun;
    }>;
    forObject: boolean | string;
  }
  | {
    type: "preverb as linking verb";
    linkingVerb: string;
  }
  | {
    type: "preverb as finitive verb";
    finitiveVerb: string;
    particle: null | string;
  }
  | { type: "preposition"; preposition: string }
  | { type: "interjection"; interjection: string };
export type Dictionary = { [word: string]: Array<Definition> };
