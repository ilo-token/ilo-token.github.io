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
  teloMisikeke: boolean;
  randomize: boolean;
  quantity: RedundancySettings;
  tense: RedundancySettings;
  xAlaXPartialParsing: boolean;
  separateRepeatedModifiers: boolean;
};
export const defaultSettings: Readonly<Settings> = {
  teloMisikeke: true,
  randomize: false,
  quantity: "both",
  tense: "both",
  xAlaXPartialParsing: false,
  separateRepeatedModifiers: false,
};
export const settings: Settings = { ...defaultSettings };
