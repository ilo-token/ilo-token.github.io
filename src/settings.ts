/**
 * Options for determining how to show different forms or conjugations of nouns
 * or verbs. See
 * https://github.com/ilo-token/ilo-token.github.io/wiki/Settings-Help#singular-and-plural-forms--verb-tenses
 * for more info
 */
export type RedundancySettings = "both" | "condensed" | "default only";
/**
 * Interface for configuring translation. See
 * https://github.com/ilo-token/ilo-token.github.io/wiki/Settings-Help for more
 * info.
 */
export type Settings = {
  "use-telo-misikeke": boolean;
  "randomize": boolean;
  "number-settings": RedundancySettings;
  "tense-settings": RedundancySettings;
  "x-ala-x-partial-parsing": boolean;
  "separate-repeated-modifiers": boolean;
};
export const defaultSettings: Readonly<Settings> = {
  "use-telo-misikeke": true,
  "randomize": false,
  "number-settings": "both",
  "tense-settings": "both",
  "x-ala-x-partial-parsing": false,
  "separate-repeated-modifiers": false,
};
export const settings: Settings = { ...defaultSettings };
