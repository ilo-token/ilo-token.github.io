export type Redundancy = "both" | "condensed" | "default only";

// may be extended but existing properties must stay unchanged
export type Settings = {
  randomize: boolean;
  multiline: boolean;
  sandbox: boolean;
  quantity: Redundancy;
  tense: Redundancy;
};
// the default value may change, also change `index.html`
export const defaultSettings: Readonly<Settings> = Object.freeze({
  randomize: false,
  multiline: false,
  sandbox: false,
  quantity: "both",
  tense: "both",
});
// this global constant is mutable
export const settings: Settings = Object.seal({ ...defaultSettings });
