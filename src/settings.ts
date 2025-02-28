export type RedundancySettings = "both" | "condensed" | "default only";

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
