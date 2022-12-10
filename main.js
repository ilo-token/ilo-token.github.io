"use strict";

class ParseError extends Error {}
/**
 * parses simple sentence without la
 */
function parseSimpleSentence(array) {
  if (array.length > 1 && (array[0] === "mi" || array[0] === "sina")) {
  } else if (array.includes("li") || array.includes("o")) {
  } else {
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
        throw new ParseError(
          'Having no content before "la" is considered invalid for this tool'
        );
      }
      beforeLa.push(sentence);
      sentence = [];
    }
  }
  if (sentence.length === 0) {
    throw new ParseError(
      'Having no content after "la" is considered invalid for this tool'
    );
  }
  throw new Error("todo");
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
          sentence: [],
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
            sentence: [],
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
              sentence: [],
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
              sentence: [],
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
    .split(/\s+/);
  return parseFromWords(words);
}
