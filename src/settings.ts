export type Redundancy = "both" | "condensed" | "default only";

// may be extended but existing properties must stay unchanged
export type Settings = {
  teloMisikeke: boolean;
  randomize: boolean;
  multiline: boolean;
  quantity: Redundancy;
  tense: Redundancy;
  xAlaXPartialParsing: boolean;
};
// the default value may change, also change `index.html`
export const defaultSettings: Readonly<Settings> = Object.freeze({
  teloMisikeke: true,
  randomize: false,
  multiline: false,
  quantity: "both",
  tense: "both",
  xAlaXPartialParsing: false,
});
// this global constant is mutable
export const settings: Settings = Object.seal({ ...defaultSettings });
