export type NounForms = Readonly<{
  singular: null | string;
  plural: null | string;
}>;
export type Noun =
  & NounForms
  & Readonly<{
    determiner: ReadonlyArray<Determiner>;
    adjective: ReadonlyArray<Adjective>;
    gerund: boolean;
    postAdjective:
      | null
      | Readonly<{
        adjective: string;
        name: string;
      }>;
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
export type Adjective = Readonly<{
  adverb: ReadonlyArray<string>;
  adjective: string;
  kind: AdjectiveType;
  gerundLike: boolean;
}>;
export type VerbForms = Readonly<{
  presentPlural: string;
  presentSingular: string;
  past: string;
}>;
export type Verb =
  & VerbForms
  & Readonly<{
    directObject: null | Noun;
    indirectObject: ReadonlyArray<
      Readonly<{
        preposition: string;
        object: Noun;
      }>
    >;
    forObject: boolean | string;
    predicateType: null | "verb" | "noun adjective";
  }>;
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
    adjective: ReadonlyArray<Adjective>;
  }>
  | Readonly<{ type: "adverb"; adverb: string }>
  | (Readonly<{ type: "verb" }> & Verb)
  | Readonly<{ type: "modal verb"; verb: string }>
  | Readonly<{ type: "preposition"; preposition: string }>
  | Readonly<{ type: "interjection"; interjection: string }>;
export type Entry = Readonly<{
  definitions: ReadonlyArray<Definition>;
  src: string;
}>;
export type Dictionary = Map<string, Entry>;
