import { characterClass } from "../misc.ts";
import { UCSUR_COLON, UCSUR_MIDDLE_DOT } from "./ucsur.ts";

export const ELLIPSIS = "\u2026";
const MIDDLE_DOT = "\u00B7";

const ASCII_SENTENCE_TERMINATOR = [".", ",", ":", ";", "?", "!"];
const FULL_WIDTH_PERIOD = [
  "\u3002",
  "\uFF61",
  "\uFE12",
  "\u30FB",
  UCSUR_MIDDLE_DOT,
];
const FULL_WIDTH_COLON = ["\uFF1A", UCSUR_COLON];
const NSK_PERIOD_SET = [...FULL_WIDTH_PERIOD, "\uFF0F"];

export const SENTENCE_TERMINATOR_TO_ASCII = new Map([
  ...ASCII_SENTENCE_TERMINATOR.map((symbol) => [symbol, symbol] as const),
  ...FULL_WIDTH_PERIOD.map((period) => [period, "."] as const),
  ...FULL_WIDTH_COLON.map((colon) => [colon, ":"] as const),
  [ELLIPSIS, "..."] as const,
  [MIDDLE_DOT, "."] as const,
]);

export const SENTENCE_TERMINATOR = characterClass(
  SENTENCE_TERMINATOR_TO_ASCII.keys(),
);
export const NSK_PERIOD = characterClass(NSK_PERIOD_SET);
export const NSK_COLON = characterClass(FULL_WIDTH_COLON);
