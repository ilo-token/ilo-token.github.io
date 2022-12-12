"use strict";

class ParseError extends Error {}

const HEADWORD = [
  "akesi",
  "ala",
  "alasa",
  "ale",
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
  "leko",
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
  "pan",
  "pana",
  "pilin",
  "pimeja",
  "pini",
  "pipi",
  "poka",
  "pona",
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
  "utala",
  "walo",
  "wan",
  "waso",
  "wawa",
  "weka",
  "wile",
];
const MODIFIER = HEADWORD.concat("taso");
const PREPOSITION = ["tawa", "lon", "sama", "tan", "kepeken"];
/**
 * parses phrase
 */
function parsePhrase(array) {
  throw new Error("todo");
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
    throw new Error("todo");
  } else if (array.includes("li")) {
    if (array[0] === "mi" || array[0] === "sina") {
      throw new ParseError(`"${array[0]} li (pred)" construction`);
    }
    if (array.includes("o")) {
      throw new ParseError('clause with both "li" and "o"');
    }
    throw new Error("todo");
  } else if (array.includes("o")) {
    if (array.slice(array.indexOf("o")).includes("o")) {
      throw new ParseError('clause with multiple "o"');
    }
    throw new Error("todo");
  } else {
    parsePhrase(array).map((phrase) => ({
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
  for (let i = 0; i < array.length; i++) {
    if (array[i] === "la") {
      if (sentence.length === 0) {
        throw new ParseError('Having no content before "la"');
      }
      if (array[i + 1] === "a") {
        throw new ParseError('"la a"');
      }
      beforeLa.push(sentence);
      sentence = [];
    } else {
      sentence.push(array[i]);
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
    for (let i = 1; i < array.length; i++) {
      if (array[i] !== "a") {
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
              sentence,
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
          sentence,
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
  const words = tokiPona
    .trim()
    .replace(/[.!?]*$/, "")
    .replaceAll(",", " ");
  if (/[:.!?]/.test(words)) {
    throw new ParseError("Multiple sentences");
  }
  return parseFromWords(words.split(/\s+/));
}
