/** Module for translation settings stored as a global state */

/** */
export type RedundancySettings = "both" | "condensed" | "default only";
export type Settings = {
  useTeloMisikeke: boolean;
  randomize: boolean;
  xAlaXPartialParsing: boolean;
  number: RedundancySettings;
  tense: RedundancySettings;
};
export const defaultSettings: Settings = {
  useTeloMisikeke: false,
  randomize: false,
  xAlaXPartialParsing: false,
  number: "both",
  tense: "both",
};
export const settings: Settings = {
  useTeloMisikeke: false,
  randomize: false,
  xAlaXPartialParsing: false,
  number: "both",
  tense: "both",
};
