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
// may be extended but existing properties must stay unchanged
export type Settings = {
  teloMisikeke: boolean;
  randomize: boolean;
  multiline: boolean;
  quantity: RedundancySettings;
  tense: RedundancySettings;
  xAlaXPartialParsing: boolean;
  separateRepeatedModifiers: boolean;
};
// the default value may change
export const defaultSettings: Readonly<Settings> = Object.freeze({
  teloMisikeke: true,
  randomize: false,
  multiline: false,
  quantity: "both",
  tense: "both",
  xAlaXPartialParsing: false,
  separateRepeatedModifiers: false,
});
export const settings: Settings = Object.seal({ ...defaultSettings });
