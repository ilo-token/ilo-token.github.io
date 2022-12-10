"use strict";

/**
 * parses array of toki pona words without a's and taso particles in the start
 * and end of an array
 */
function parsePureSentence(array) {
  throw new Error("todo");
}
/**
 * parses array of toki pona words
 */
function parseFromWords(array) {
  throw new Error("todo");
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
