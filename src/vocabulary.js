export const PARTICLES = new Set([
  "a",
  "ala",
  "anu",
  "e",
  "en",
  "la",
  "li",
  "nanpa",
  "o",
  "pi",
  "taso",
]);
export const HEADWORD = new Set([
  "akesi",
  "ala",
  "alasa",
  "ale",
  "ali",
  "anpa",
  "ante",
  "awen",
  "esun",
  "ijo",
  "ike",
  "ilo",
  "insa",
  "jaki",
  "jan",
  "jelo",
  "jo",
  "kala",
  "kalama",
  "kama",
  "kasi",
  "ken",
  "kili",
  "kiwen",
  "ko",
  "kon",
  "kule",
  "kulupu",
  "kute",
  "lape",
  "laso",
  "lawa",
  "len",
  "lete",
  "lili",
  "linja",
  "lipu",
  "loje",
  "lon",
  "luka",
  "lukin",
  "lupa",
  "ma",
  "mama",
  "mani",
  "meli",
  "mi",
  "mije",
  "moku",
  "moli",
  "monsi",
  "mu",
  "mun",
  "musi",
  "mute",
  "nanpa",
  "nasa",
  "nasin",
  "nena",
  "ni",
  "nimi",
  "noka",
  "olin",
  "ona",
  "open",
  "pakala",
  "pali",
  "palisa",
  "pan",
  "pana",
  "pilin",
  "pimeja",
  "pini",
  "pipi",
  "poka",
  "poki",
  "pona",
  "sama",
  "seli",
  "selo",
  "seme",
  "sewi",
  "sijelo",
  "sike",
  "sin",
  "sina",
  "sinpin",
  "sitelen",
  "sona",
  "soweli",
  "suli",
  "suno",
  "supa",
  "suwi",
  "tan",
  "tawa",
  "telo",
  "tenpo",
  "toki",
  "tomo",
  "tonsi",
  "tu",
  "unpa",
  "uta",
  "utala",
  "walo",
  "wan",
  "waso",
  "wawa",
  "weka",
  "wile",
]);
export const MODIFIER = new Set([...HEADWORD, "taso"]);
export const NUMBER = new Set([wan, tu, luka, mute, ale, ali]);
export const PREVERB = new Set([
  "alasa",
  "awen",
  "kama",
  "ken",
  "lukin",
  "open",
  "pini",
  "sona",
  "wile",
]);
export const PREPOSITION = new Set(["kepeken", "lon", "sama", "tan", "tawa"]);
export const VOCABULARY = new Set([
  ...PARTICLES,
  ...HEADWORD,
  ...PREVERB,
  ...PREPOSITION,
]);