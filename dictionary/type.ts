export type NounForms = {
  singular: null | string;
  plural: null | string;
};
export type Noun = NounForms & {
  determiner: ReadonlyArray<Determiner>;
  adjective: ReadonlyArray<Adjective>;
  gerund: boolean;
  postAdjective: null | {
    adjective: string;
    name: string;
  };
};
export type PronounForms = {
  singular: null | { subject: string; object: string };
  plural: null | { subject: string; object: string };
};
export type Perspective = "first" | "second" | "third";
export type Pronoun = PronounForms & { perspective: Perspective };
export type DeterminerType =
  | "article"
  | "demonstrative"
  | "distributive"
  | "interrogative"
  | "possessive"
  | "quantifier"
  | "negative"
  | "numeral";
export type Quantity = "singular" | "plural" | "both";
export type Determiner = {
  determiner: string;
  plural: null | string;
  kind: DeterminerType;
  quantity: Quantity;
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
  adverb: ReadonlyArray<string>;
  adjective: string;
  kind: AdjectiveType;
};
export type VerbForms = {
  presentPlural: string;
  presentSingular: string;
  past: string;
};
export type Verb = VerbForms & {
  directObject: null | Noun;
  indirectObject: ReadonlyArray<{
    preposition: string;
    object: Noun;
  }>;
  forObject: boolean | string;
  predicateType: null | "verb" | "noun adjective";
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
  | ({ type: "personal pronoun" } & Pronoun)
  | ({ type: "determiner" } & Determiner)
  | { type: "numeral"; numeral: number }
  | ({ type: "adjective" } & Adjective)
  | { type: "compound adjective"; adjective: ReadonlyArray<Adjective> }
  | { type: "adverb"; adverb: string }
  | ({ type: "verb" } & Verb)
  | { type: "modal verb"; verb: string }
  | { type: "preposition"; preposition: string }
  | { type: "interjection"; interjection: string };
export type Entry = { definitions: ReadonlyArray<Definition>; src: string };
export type Dictionary = Map<string, Entry>;
