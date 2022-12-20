"use strict";

class ParseError extends Error {}

const PARTICLES = new Set([
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
const HEADWORD = new Set([
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
const MODIFIER = new Set([...HEADWORD, "taso"]);
const PREVERB = new Set([
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
const PREPOSITION = new Set(["kepeken", "lon", "sama", "tan", "tawa"]);
let VOCABULARY = new Set([
  ...PARTICLES,
  ...HEADWORD,
  ...PREVERB,
  ...PREPOSITION,
]);
const NOUN = {
  akesi: ["reptile", "reptiles", "amphibian", "amphibians"],
  ala: ["nothing", "no"],
  alasa: ["searching"],
  ale: ["everything"],
  ali: ["everything"],
  anpa: ["bottom", "bottoms"],
  ante: ["change", "changes"],
  awen: ["staying"],
  esun: ["shop", "shops"],
  ijo: ["thing", "things"],
  ike: ["badness"],
  ilo: ["tool", "tools"],
  insa: ["inside", "insides"],
  jaki: ["obscenity", "obscenities"],
  jan: ["person", "people", "human", "humans", "humanity"],
  jelo: ["yellowness"],
  jo: ["possession", "possessions"],
  kala: ["fish", "fishes"],
  kalama: ["sound", "sounds"],
  kama: ["arrival", "arrivals"],
  kasi: ["plant", "plants"],
  ken: ["ability", "abilities", "possibility", "possibilities"],
  kili: ["fruit", "fruits", "vegetable", "vegetables"],
  kiwen: ["hard thing", "hard things"],
  ko: ["soft thing", "soft things", "powder"],
  kon: ["air", "essence"],
  kule: ["color", "colors"],
  kulupu: ["group", "groups"],
  kute: ["ear", "ears", "listening"],
  lape: ["sleep", "rest"],
  laso: ["blueness", "greenness"],
  lawa: ["head", "heads", "control", "controls"],
  len: ["cloth", "clothes", "hiding"],
  lete: ["coldness"],
  lili: ["smallness"],
  linja: ["long flexible thing", "long flexible things"],
  lipu: ["book", "books", "paper", "paper-like thing", "paper-like things"],
  loje: ["redness"],
  lon: ["truth", "true"],
  luka: ["hand", "hands", "arm", "arms"],
  lukin: ["eye", "eyes", "sight"],
  lupa: ["hole", "holes"],
  ma: ["place", "places", "earth"],
  mama: ["parent", "parents", "creator"],
  mani: ["money", "large domestic animal", "large domestic animals"],
  meli: ["woman", "women", "feminity"],
  mi: ["I", "me", "we", "us"],
  mije: ["man", "men", "masculinity"],
  moku: ["food", "foods", "drink", "drinks"],
  moli: ["death"],
  monsi: ["back"],
  mu: ["moo"],
  mun: ["moon", "moons", "star", "stars", "planet", "planets", "glowing thing"],
  musi: ["entertainment", "entertainments"],
  mute: ["many"],
  nanpa: ["number", "numbers"],
  nasa: ["silliness", "strangeness"],
  nasin: ["way"],
  nena: ["bump"],
  ni: ["this", "that"],
  nimi: ["name", "names", "word", "words"],
  noka: ["foot", "feet", "leg", "legs"],
  olin: ["love"],
  ona: ["they", "them", "it"],
  open: ["beginning", "beginnings"],
  pakala: ["mistake", "mistakes"],
  pan: ["grain", "grains"],
  pana: ["giving"],
  pali: ["work"],
  palisa: ["long hard thing", "long hard things"],
  pilin: ["feeling", "feelings", "emotion", "emotions"],
  pimeja: ["blackness", "brownness", "grayness"],
  pini: ["end", "ends"],
  pipi: ["insect", "insects", "bug", "bugs"],
  poka: ["side", "sides", "hips"],
  poki: ["container"],
  pona: ["goodness", "simplicity"],
  sama: ["similarity"],
  seli: ["fire", "heat", "chemical reaction", "chemical reactions"],
  selo: ["skin", "shape", "shapes"],
  seme: ["what", "which"],
  sewi: ["up", "divinity"],
  sijelo: ["body", "bodies"],
  sike: ["round thing", "round things", "cycle"],
  sin: ["new thing", "new things"],
  sina: ["you", "you all"],
  sinpin: ["face", "faces", "wall", "walls"],
  sitelen: ["writing", "writings", "image", "images"],
  sona: ["knowledge"],
  soweli: ["animal", "animals"],
  suli: ["hugeness", "importance"],
  suno: ["light source", "light sources", "sun"],
  supa: ["horizontal surface", "horizontal surfaces"],
  suwi: ["sweetness", "innocence"],
  tan: ["reason"],
  tawa: ["movement"],
  telo: ["liquid"],
  tenpo: ["time"],
  toki: ["speech", "speeches", "language", "languages", "hello"],
  tomo: ["house", "houses"],
  tonsi: ["transgender", "transgenders", "non-binary", "non-binaries"],
  tu: ["pair"],
  unpa: ["sex"],
  uta: ["mouth"],
  utala: ["conflict", "difficulty"],
  walo: ["whiteness", "paleness"],
  wan: ["one"],
  waso: ["bird", "birds"],
  wawa: ["power", "powers"],
  weka: ["leaving"],
  wile: ["want", "wants", "need", "needs"],
};
const ADJECTIVE = {
  akesi: ["reptilian", "amphibian"],
  ala: ["not", "no"],
  alasa: [],
  ale: ["all"],
  ali: ["all"],
  anpa: ["bottom"],
  ante: ["other"],
  awen: ["staying"],
  esun: [],
  ijo: [],
  ike: ["bad"],
  ilo: [],
  insa: [],
  jaki: ["gross"],
  jan: ["humanly"],
  jelo: ["yellow"],
  jo: [],
  kala: ["fish-like"],
  kalama: ["sounding"],
  kama: ["arriving"],
  kasi: ["plant-like"],
  ken: [],
  kili: [],
  kiwen: ["hard"],
  ko: ["soft"],
  kon: [],
  kule: ["colorful"],
  kulupu: [],
  kute: [],
  lape: [],
  laso: ["blue", "green"],
  lawa: [],
  len: ["hidden"],
  lete: ["cold"],
  lili: ["small"],
  linja: ["long flexible"],
  lipu: ["paper-like"],
  loje: ["red"],
  lon: ["truthful"],
  luka: [],
  lukin: [],
  lupa: [],
  ma: ["earthy"],
  mama: [],
  mani: [],
  meli: ["woman", "feminine"],
  mi: ["my", "our"],
  mije: ["man", "masculine"],
  moku: [],
  moli: ["dead"],
  monsi: [],
  mu: ["mooing"],
  mun: ["glowing"],
  musi: ["entertaining"],
  mute: ["many"],
  nanpa: ["numeric"],
  nasa: ["silly", "strange"],
  nasin: [],
  nena: [],
  ni: ["this", "that"],
  nimi: [],
  noka: [],
  olin: [],
  ona: ["their", "its"],
  open: [],
  pakala: ["broken"],
  pan: [],
  pana: [],
  pali: ["working"],
  palisa: ["long hard"],
  pilin: [],
  pimeja: ["black", "brown", "gray"],
  pini: [],
  pipi: ["bug-like", "insect-like"],
  poka: [],
  poki: [],
  pona: ["good", "simple"],
  sama: [],
  seli: ["hot"],
  selo: [],
  seme: ["what", "which"],
  sewi: ["divine"],
  sijelo: [],
  sike: ["round"],
  sin: ["new"],
  sina: ["your"],
  sinpin: [],
  sitelen: [],
  sona: ["knowledgeable"],
  soweli: ["animal-like"],
  suli: ["huge", "important"],
  suno: ["shining"],
  supa: [],
  suwi: ["sweet", "innocent"],
  tan: [],
  tawa: ["moving"],
  telo: ["liquid"],
  tenpo: [],
  toki: ["speaking", "writing"],
  tomo: [],
  tonsi: ["transgender", "non-binary"],
  tu: ["two"],
  unpa: ["sexual"],
  uta: [],
  utala: ["conflicting", "difficult"],
  walo: ["white", "pale"],
  wan: ["one"],
  waso: ["bird-like"],
  wawa: ["powerful"],
  weka: ["leaving"],
  wile: [],
};
const ADVERB = {
  akesi: [],
  ala: ["not"],
  alasa: [],
  ale: ["completely"],
  ali: ["completely"],
  anpa: [],
  ante: ["differently"],
  awen: [],
  esun: [],
  ijo: [],
  ike: ["badly"],
  ilo: [],
  insa: [],
  jaki: ["disgustingly"],
  jan: [],
  jelo: [],
  jo: [],
  kala: [],
  kalama: [],
  kama: [],
  kasi: [],
  ken: [],
  kili: [],
  kiwen: [],
  ko: [],
  kon: [],
  kule: ["colorfully"],
  kulupu: [],
  kute: [],
  lape: [],
  laso: [],
  lawa: [],
  len: [],
  lete: [],
  lili: ["slightly"],
  linja: [],
  lipu: [],
  loje: [],
  lon: ["truthfully"],
  luka: [],
  lukin: [],
  lupa: [],
  ma: [],
  mama: [],
  mani: [],
  meli: [],
  mi: [],
  mije: [],
  moku: [],
  moli: [],
  monsi: [],
  mu: [],
  mun: [],
  musi: [],
  mute: ["very"],
  nanpa: ["numerically"],
  nasa: [],
  nasin: [],
  nena: [],
  ni: [],
  nimi: [],
  noka: [],
  olin: [],
  ona: [],
  open: [],
  pakala: [],
  pan: [],
  pana: [],
  pali: [],
  palisa: [],
  pilin: [],
  pimeja: [],
  pini: [],
  pipi: [],
  poka: [],
  poki: [],
  pona: ["properly"],
  sama: ["equally"],
  seli: [],
  selo: [],
  seme: [],
  sewi: ["divinely"],
  sijelo: [],
  sike: ["repeatedly"],
  sin: ["newly"],
  sina: [],
  sinpin: [],
  sitelen: [],
  sona: ["knowledgeably"],
  soweli: [],
  suli: ["hugely", "importantly"],
  suno: [],
  supa: [],
  suwi: [],
  tan: [],
  tawa: [],
  telo: [],
  tenpo: [],
  toki: [],
  tomo: [],
  tonsi: [],
  tu: [],
  unpa: ["sexually"],
  uta: [],
  utala: ["conflictingly", "difficultly"],
  walo: [],
  wan: [],
  waso: [],
  wawa: ["powerfully"],
  weka: [],
  wile: [],
};

function translatePhraseToAdverb(phrase) {
  let translations = ADVERB[phrase.headword].slice();
  if (phrase.emphasis === "headword") {
    translations = translations.flatMap((word) => [`so ${word}`, `(${word})`]);
  }
  for (const modifier of phrase.modifiers) {
    switch (modifier.type) {
      case "proper word":
        return [];
      case "word":
        if (modifier.emphasized) {
          translations = translations.flatMap((word) =>
            ADVERB[modifier.word].flatMap((adverb) => [
              `(${adverb}) ${word}`,
              `so ${adverb} ${word}`,
            ])
          );
        } else {
          translations = translations.flatMap((word) =>
            ADVERB[modifier.word].map((adverb) => `${adverb} ${word}`)
          );
        }
        break;
      case "pi":
        throw new Error("todo");
    }
  }
  if (phrase.emphasis === "whole") {
    translations = translations.map((translation) => `(${translation})`);
  }
  return translations;
}
/**
 * translates phrase into adjective
 */
function translatePhraseToAdjective(phrase) {
  let translations = ADJECTIVE[phrase.headword].slice();
  if (phrase.emphasis === "headword") {
    translations = translations.flatMap((word) => [`so ${word}`, `(${word})`]);
  }
  for (const modifier of phrase.modifiers) {
    switch (modifier.type) {
      case "proper word":
        if (modifier.emphasized) {
          translations = translations.map(
            (word) => `${word} (named ${modifier.name})`
          );
        } else {
          translations = translations.map(
            (word) => `${word} named ${modifier.name}`
          );
        }
        break;
      case "word":
        if (modifier.emphasized) {
          translations = translations.flatMap((word) =>
            ADVERB[modifier.word].flatMap((adverb) => [
              `(${adverb}) ${word}`,
              `so ${adverb} ${word}`,
            ])
          );
        } else {
          translations = translations.flatMap((word) =>
            ADVERB[modifier.word].map((adverb) => `${adverb} ${word}`)
          );
        }
        break;
      case "pi":
        translations = translations.flatMap((word) =>
          translatePhraseToAdverb(phrase).map((adverb) => `${adverb} ${word}`)
        );
        break;
    }
  }
  if (phrase.emphasis === "whole") {
    translations = translations.map((translation) => `(${translation})`);
  }
  return translations;
}
/**
 * translates phrase into noun phrase without "of"s
 *
 * this doesn't handle whole phrase emphasis
 */
function translatePhraseToSimpleNoun(phrase) {
  let translations = NOUN[phrase.headword].slice();
  if (phrase.emphasis === "headword") {
    translations = translations.map((word) => `(${word})`);
  }
  for (const modifier of phrase.modifiers) {
    switch (modifier.type) {
      case "proper word":
        if (modifier.emphasized) {
          translations = translations.map(
            (word) => `${word} (named ${modifier.name})`
          );
        } else {
          translations = translations.map(
            (word) => `${word} named ${modifier.name}`
          );
        }
        break;
      case "word":
        if (modifier.emphasized) {
          translations = translations.flatMap((word) =>
            ADJECTIVE[modifier.word].flatMap((adjective) => [
              `(${adjective}) ${word}`,
              `so ${adjective} ${word}`,
            ])
          );
        } else {
          translations = translations.flatMap((word) =>
            ADJECTIVE[modifier.word].map((adjective) => `${adjective} ${word}`)
          );
        }
        break;
      case "pi":
        translations = translations.flatMap((word) =>
          translatePhraseToAdjective(phrase).map(
            (adjective) => `${adjective} ${word}`
          )
        );
        break;
    }
  }
  return translations;
}
/**
 * translates phrase into noun phrase with "of"s
 */
function translatePhraseToNoun(phrase) {
  let translations = translatePhraseToSimpleNoun(phrase);
  for (const [i, item] of phrase.modifiers.entries()) {
    const heads = translatePhraseToSimpleNoun({
      ...phrase,
      modifiers: [
        ...phrase.modifiers.slice(0, i),
        ...phrase.modifiers.slice(i + 1),
      ],
    });
    switch (item.type) {
      case "proper word":
        continue;
      case "word":
        if (item.emphasized) {
          for (const head of heads) {
            for (const noun of NOUN[item.word]) {
              translations.push(`${head} of (${noun})`);
            }
          }
        } else {
          for (const head of heads) {
            for (const noun of NOUN[item.word]) {
              translations.push(`${head} of ${noun}`);
            }
          }
        }
        break;
      case "pi":
        const phrases = translatePhraseToSimpleNoun(item);
        for (const head of heads) {
          for (const phrase of phrases) {
            translations.push(`${head} of ${phrase}`);
          }
        }
        break;
    }
  }
  if (phrase.emphasis === "whole") {
    translations = translations.map((translation) => `(${translation})`);
  }
  return translations;
}
/**
 * translates clauses before la
 */
function translateLaClause(clause) {
  switch (clause.type) {
    case "phrase":
      return translatePhraseToNoun(clause);
    default:
      throw new Error("todo");
  }
}
/**
 * translates clauses after la or without la
 */
function translateFinalClause(clause) {
  switch (clause.type) {
    case "phrase":
      return [
        ...translatePhraseToNoun(clause),
        ...translatePhraseToAdjective(clause),
      ];
    default:
      throw new Error("todo");
  }
}
/**
 * translates sentence without a or taso
 */
function translatePureSentence(sentence) {
  if (sentence.beforeLa.length > 0) {
    throw new Error("todo");
  }
  return translateFinalClause(sentence.sentence);
}
function translateSentence(sentence) {
  let start;
  switch (sentence.start.type) {
    case "none":
      start = "";
      break;
    case "a":
      if (sentence.start.count === 1) {
        start = "ah";
      } else {
        start = Array(sentence.start.count).fill("ha").join("");
      }
      break;
    case "taso":
      if (sentence.start.emphasized) {
        start = "(however),";
      } else {
        start = "however,";
      }
      break;
  }
  let punctuation = ".";
  let end;
  switch (sentence.end.type) {
    case "none":
      end = "";
      break;
    case "a":
      if (sentence.end.count === 1) {
        punctuation = "!";
        end = "";
      } else {
        end = Array(sentence.end.count).fill("ha").join("");
      }
      break;
  }
  if (sentence.type === "a or taso only") {
    return [`${start} ${end}`.trim() + punctuation];
  } else {
    return translatePureSentence(sentence).map(
      (sentence) => `${start} ${sentence} ${end}`.trim() + punctuation
    );
  }
}
/**
 * parses string of modifiers
 */
function parseModifier(array) {
  if (array.length === 0) {
    return [[]];
  }
  let modifiers = [[]];
  // TODO: handle multiple separate proper word as error
  for (const [i, item] of array.entries()) {
    if (item === "pi") {
      const phrases = parsePhrase(array.slice(i + 1));
      modifiers = modifiers.flatMap((arr) =>
        phrases.map((phrase) =>
          arr.concat([
            {
              type: "pi",
              ...phrase,
            },
          ])
        )
      );
      break;
    }
    if (item === "a") {
      for (const arr of modifiers) {
        arr[arr.length - 1].emphasized = true;
      }
    } else if (/^[A-Z]/.test(item)) {
      for (const arr of modifiers) {
        if (arr.length > 0 && arr[arr.length - 1].type === "proper word") {
          const properWord = arr.pop();
          arr.push({
            type: "proper word",
            name: properWord.name + " " + item,
            emphasized: false,
          });
        } else {
          arr.push({
            type: "proper word",
            name: item,
            emphasized: false,
          });
        }
      }
    } else if (!MODIFIER.has(item)) {
      if (VOCABULARY.has(item)) {
        throw new ParseError(`"${item}" as modifier`);
      } else {
        throw new ParseError(`"${item}"`);
      }
    } else {
      for (const arr of modifiers) {
        arr.push({
          type: "word",
          word: item,
          emphasized: false,
        });
      }
    }
  }
  return modifiers;
}
/**
 * parses phrase
 */
function parsePhrase(array) {
  if (/^[A-Z]/.test(array[0])) {
    throw new ParseError("Proper name as headword");
  }
  if (!HEADWORD.has(array[0])) {
    if (VOCABULARY.has(array[0])) {
      throw new ParseError(`"${array[0]}" as headword`);
    } else {
      throw new ParseError(`"${array[0]}"`);
    }
  }
  if (array[1] === "a") {
    return parseModifier(array.slice(2)).map((modifier) => ({
      headword: array[0],
      emphasis: "headword",
      modifiers: modifier,
    }));
  }
  if (array[array.length - 1] === "a") {
    return [
      ...parseModifier(array.slice(1, -1)).map((modifier) => ({
        headword: array[0],
        emphasis: "whole",
        modifiers: modifier,
      })),
      ...parseModifier(array.slice(1)).map((modifier) => ({
        headword: array[0],
        emphasis: "none",
        modifiers: modifier,
      })),
    ];
  }
  return parseModifier(array.slice(1)).map((modifier) => ({
    headword: array[0],
    emphasis: "none",
    modifiers: modifier,
  }));
}
/**
 * parses subject which may have "en" in it
 */
function parseSubject(array) {
  throw new Error("todo");
}
/**
 * parses predicate after "li" or "o", also handles multiple "li"
 */
function parsePredicate(array) {
  throw new Error("todo");
}
/**
 * parses simple sentence without la
 */
function parseClause(array) {
  if (
    array.length > 1 &&
    (array[0] === "mi" || array[0] === "sina") &&
    !array.includes("li")
  ) {
    if (array[1] === "a") {
      if (array.length === 2) {
        throw new ParseError(`"${array[0]} a (pred)" construction`);
      } else {
        throw new Error("todo");
      }
    }
    throw new Error("todo");
  } else if (array.includes("li")) {
    if ((array[0] === "mi" || array[0] === "sina") && array[1] === "li") {
      throw new ParseError(`"${array[0]} li (pred)" construction`);
    }
    if (array.includes("o")) {
      throw new ParseError('Clause with both "li" and "o"');
    }
    throw new Error("todo");
  } else if (array.includes("o")) {
    if (array.slice(array.indexOf("o")).includes("o")) {
      throw new ParseError('Multiple "o"s');
    }
    throw new Error("todo");
  } else {
    return parsePhrase(array).map((phrase) => ({
      type: "phrase",
      ...phrase,
    }));
  }
}
/**
 * parses sentence without "a" and "taso" particles in the start and end of an
 * array
 *
 * if empty array is passed, this will return type of "a or taso only",
 * intended for sentences sentences that only contains a or taso
 */
function parsePureSentence(array) {
  if (array.length === 0) {
    return [
      {
        type: "a or taso only",
      },
    ];
  }
  const beforeLa = [];
  let sentence = [];
  for (const [i, item] of array.entries()) {
    if (item === "la") {
      if (sentence.length === 0) {
        throw new ParseError('Having no content before "la"');
      }
      if (array[i + 1] === "a") {
        throw new ParseError('"la a"');
      }
      beforeLa.push(sentence);
      sentence = [];
    } else {
      sentence.push(item);
    }
  }
  if (sentence.length === 0) {
    throw new ParseError('Having no content after "la"');
  }
  let beforeLaClauses = [[]];
  for (const clause of beforeLa) {
    beforeLaClauses = beforeLaClauses.flatMap((prev) =>
      parseClause(clause).map((parsedClause) => prev.concat([parsedClause]))
    );
  }
  return parseClause(sentence).flatMap((sentence) =>
    beforeLaClauses.map((clauses) => ({
      type: "la",
      beforeLa: clauses,
      sentence,
    }))
  );
}
/**
 * parses sentence
 */
function parseFromWords(array) {
  if (array.length === 0) {
    return [];
  }
  let start = {
    type: "none",
  };
  let start_slice = 0;
  if (array[0] === "a") {
    let broke = false;
    for (const [i, item] of [...array.entries()].filter(([i, _]) => i > 1)) {
      if (item !== "a") {
        start = {
          type: "a",
          count: i,
        };
        start_slice = i;
        broke = true;
        break;
      }
    }
    if (!broke) {
      return [
        {
          start: {
            type: "a",
            count: array.length,
          },
          end: {
            type: "none",
          },
          type: "a or taso only",
        },
      ];
    }
  } else if (array[0] === "taso") {
    switch (array.length) {
      case 1:
        return [
          {
            start: {
              type: "taso",
              emphasized: false,
            },
            end: {
              type: "none",
            },
            type: "a or taso only",
          },
        ];
      case 2:
        if (array[1] === "a") {
          return [
            {
              start: {
                type: "taso",
                emphasized: true,
              },
              end: {
                type: "none",
              },
              type: "a or taso only",
            },
            {
              start: {
                type: "taso",
                emphasized: false,
              },
              end: {
                type: "a",
                count: 1,
              },
              type: "a or taso only",
            },
          ];
        }
        break;
    }
    if (array[1] === "a") {
      start = {
        type: "taso",
        emphasized: true,
      };
      start_slice = 2;
    } else {
      start = {
        type: "taso",
        emphasized: false,
      };
      start_slice = 1;
    }
  }
  if (array[array.length - 1] === "a") {
    if (array[array.length - 2] === "a") {
      for (let i = 2; i < array.length; i++) {
        if (array[array.length - 1 - i] !== "a") {
          return parsePureSentence(array.slice(start_slice, -i)).map(
            (sentence) => ({
              start,
              end: {
                type: "a",
                count: i,
              },
              ...sentence,
            })
          );
        }
      }
    } else {
      return [
        ...parsePureSentence(array.slice(start_slice)).map((sentence) => ({
          start,
          end: {
            type: "none",
          },
          ...sentence,
        })),
        ...parsePureSentence(array.slice(start_slice, -1)).map((sentence) => ({
          start,
          end: {
            type: "a",
            count: 1,
          },
          ...sentence,
        })),
      ];
    }
  } else {
    return parsePureSentence(array.slice(start_slice)).map((sentence) => ({
      start,
      end: {
        type: "none",
      },
      ...sentence,
    }));
  }
}
/**
 * parses toki pona sentence into multiple possible AST represented as array
 */
function parse(tokiPona) {
  const cleanSentence = tokiPona
    .trim()
    .replace(/[.!?]*$/, "")
    .replaceAll(",", " ");
  if (/[:.!?]/.test(cleanSentence)) {
    throw new ParseError("Multiple sentences");
  }
  let words = cleanSentence.split(/\s+/);
  if (words[0] === "") {
    words = [];
  }
  if (words.includes("anu")) {
    throw new ParseError('"anu"');
  }
  // TODO: handle multiple consecutive "a"s inside sentence as error
  return parseFromWords(words);
}
function translate(tokiPona) {
  return parse(tokiPona).flatMap(translateSentence);
}
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("input");
  const output = document.getElementById("output");
  const error = document.getElementById("error");
  input.addEventListener("input", () => {
    while (output.children.length > 0) {
      output.removeChild(output.children[0]);
    }
    error.innerText = "";
    let translations;
    try {
      translations = translate(input.value);
    } catch (e) {
      if (e instanceof ParseError) {
        error.innerText = `${e.message} is unrecognized`;
        return;
      } else {
        throw e;
      }
    }
    if (translations.length === 0) {
      error.innerText = `whoops`;
    }
    for (const translation of translations) {
      const emphasized = translation
        .replaceAll("(", "<em>")
        .replaceAll(")", "</em>");
      const list = document.createElement("li");
      list.innerHTML = emphasized;
      output.appendChild(list);
    }
  });
});
