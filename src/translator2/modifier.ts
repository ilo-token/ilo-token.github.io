import * as Dictionary from "../../dictionary/type.ts";
import * as English from "./ast.ts";

export type ModifierTranslation =
    | Readonly<{ type: "noun"; noun: English.NounPhrase }>
    | Readonly<{
    type: "noun preposition";
    noun: English.NounPhrase;
    preposition: string;
}>
    | Readonly<{ type: "adjective"; adjective: English.AdjectivePhrase }>
    | Readonly<{ type: "determiner"; determiner: Dictionary.Determiner }>
    | Readonly<{ type: "adverb"; adverb: English.Adverb }>
    | Readonly<{ type: "name"; name: string }>;
export type AdjectivalModifier = Readonly<{
    nounPreposition:
        | null
        | Readonly<{ noun: English.NounPhrase; preposition: string }>;
    determiners: ReadonlyArray<Dictionary.Determiner>;
    adjectives: ReadonlyArray<English.AdjectivePhrase>;
    name: null | string;
    ofPhrase: ReadonlyArray<English.NounPhrase>;
}>;
export type AdverbialModifier = Readonly<{
    adverbs: ReadonlyArray<English.Adverb>;
    inWayPhrase: null | English.NounPhrase;
}>;
export type MultipleModifierTranslation =
    | (Readonly<{ type: "adjectival" }> & AdjectivalModifier)
    | (Readonly<{ type: "adverbial" }> & AdverbialModifier);
