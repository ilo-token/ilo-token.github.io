export type NounForms = Readonly<{
  singular: null | string;
  plural: null | string;
}>;
export type PostAdjective = Readonly<{
  adjective: string;
  name: string;
}>;
export type Noun =
  & NounForms
  & Readonly<{
    determiners: ReadonlyArray<Determiner>;
    adjectives: ReadonlyArray<Adjective>;
    gerund: boolean;
    postAdjective: null | PostAdjective;
  }>;
export type PronounForms = Readonly<{
  singular: null | Readonly<{ subject: string; object: string }>;
  plural: null | Readonly<{ subject: string; object: string }>;
}>;
export type Perspective = "first" | "second" | "third";
export type Pronoun = PronounForms & Readonly<{ perspective: Perspective }>;
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
export type Determiner = Readonly<{
  determiner: string;
  plural: null | string;
  kind: DeterminerType;
  quantity: Quantity;
}>;
export type AdjectiveType =
  | "opinion"
  | "size"
  | "physical quality"
  | "age"
  | "color"
  | "origin"
  | "material"
  | "qualifier";
export type Adverb = Readonly<{
  adverb: string;
  negative: boolean;
}>;
export type Adjective = Readonly<{
  adverbs: ReadonlyArray<Adverb>;
  adjective: string;
  kind: AdjectiveType;
  gerundLike: boolean;
}>;
export type VerbForms = Readonly<{
  presentPlural: string;
  presentSingular: string;
  past: string;
}>;
export type IndirectObject = Readonly<{
  preposition: string;
  object: Noun;
}>;
export type VerbAccessory = Readonly<{
  directObject: null | Noun;
  indirectObjects: ReadonlyArray<IndirectObject>;
  forObject: boolean | string;
  predicateType: null | "verb" | "noun adjective";
}>;
export type Verb = VerbForms & VerbAccessory;
export type Definition =
  | Readonly<{ type: "filler"; before: string; repeat: string; after: string }>
  | Readonly<{ type: "particle definition"; definition: string }>
  | (Readonly<{ type: "noun" }> & Noun)
  | Readonly<{
    type: "noun preposition";
    noun: Noun;
    preposition: string;
  }>
  | (Readonly<{ type: "personal pronoun" }> & Pronoun)
  | (Readonly<{ type: "determiner" }> & Determiner)
  | Readonly<{ type: "numeral"; numeral: number }>
  | (Readonly<{ type: "adjective" }> & Adjective)
  | Readonly<{
    type: "compound adjective";
    adjectives: ReadonlyArray<Adjective>;
  }>
  | (Readonly<{ type: "adverb" }> & Adverb)
  | (Readonly<{ type: "verb" }> & Verb)
  | Readonly<{ type: "modal verb"; verb: string }>
  | Readonly<{ type: "preposition"; preposition: string }>
  | Readonly<{ type: "interjection"; interjection: string }>;
export type Entry = Readonly<{
  definitions: ReadonlyArray<Definition>;
  source: string;
}>;
export type Dictionary = Map<string, Entry>;
