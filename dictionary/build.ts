import nlp from "compromise/three";
import { AdjectiveType } from "./type.ts";
import { DeterminerType } from "./type.ts";

const SRC = await Deno.readTextFile(new URL("./dictionary", import.meta.url));

type Tag =
  | { type: "filler" }
  | { type: "particle" }
  | { type: "noun"; number: null | "singular" | "plural" }
  | { type: "personal pronoun"; number: null | "singular" | "plural" }
  | { type: "adjective"; kind: AdjectiveType }
  | {
    type: "determiner";
    kind: DeterminerType;
    number: null | "singular" | "plural";
  }
  | { type: "numeral" }
  | { type: "adverb" }
  | { type: "verb"; kind: null | "transitive" | "intransitive" }
  | { type: "preposition" }
  | { type: "interjection" }
  | { type: "conjunction" }
  | { type: "adhoc" };
