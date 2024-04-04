export type Definition =
  | {
    type: "noun";
    singular: null | string;
    plural: null | string;
    condensed: string;
  }
  | {
    type: "pronoun";
    subject: string;
    object: string;
    possessive: string;
  }
  | {
    type: "adjective";
    adjective: string;
    kind: never;
  }
  | {
    type: "adverb";
    adverb: string;
  }
  | {
    type: "verb";
    transitive: boolean;
    past: string;
    present: string;
    condensed: string;
    usePreposition: null | string;
    withPreposition: null | never;
  }
  | {
    type: "gerund";
    gerund: string;
  }
  | {
    type: "modifier as preposition";
    preposition: never;
  };
export const DICTIONARY: { [word: string]: Array<Definition> } = {};
