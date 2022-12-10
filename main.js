"use strict";
function parseFromWords(array) {
  if (array.length === 0) {
    return [];
  }
  if (array[0] === "taso") {
    return [
      {
        type: "taso",
        rest: parseFromWords(array.slice(1)),
      },
    ];
  }
  if (array[0] === "a") {
    let laugh = array.length;
    for (let i = 1; i < array.length; i++) {
      if (array[i] !== "a") {
        laugh = i - 1;
      }
    }
    return [
      { type: "a", count: laugh, rest: parseFromWords(array.slice(laugh)) },
    ];
  }
}
function parse(tokiPona) {
  const words = tokiPona
    .trim()
    .replace(/[.!?]*$/, "")
    .split(/\s+/);
  return parseFromWords(words);
}
