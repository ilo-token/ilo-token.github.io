import { PREVERB } from "./vocabulary.ts";
import { CONTENT_WORD } from "./vocabulary.ts";

const CONSONANTS = "p t k s m n l j w".split(" ");
const VOWELS = "a e i o u".split(" ");

function randomIn<T>(...items: Array<T>): T {
  if (items.length === 0) throw new Error("passed empty arguments");
  return items[randomNumber(items.length - 1)];
}
function randomNumber(max: number): number {
  return Math.floor(Math.random() * (max + 1));
}
function randomWord(set: Set<string>): string {
  return randomIn(...set);
}
function fill<T>(number: number, mapper: () => T): Array<T> {
  return new Array(number).fill(undefined).map(mapper);
}
function randomName(): string {
  const first = randomIn(...CONSONANTS).toUpperCase() + randomIn(...VOWELS);
  const more = fill(
    randomNumber(2),
    () => randomIn(...CONSONANTS) + randomIn(...VOWELS),
  );
  return first + more.join("");
}
function asAlaQuestion(word: string): Array<string> {
  return [word, "ala", word];
}
function randomModifier(): Array<string> {
  return randomIn(
    () => [randomWord(CONTENT_WORD)],
    () => asAlaQuestion(randomWord(CONTENT_WORD)),
    () => [randomName()],
    () => ["pi", ...randomPhrase()],
    () => ["nanpa", ...randomPhrase()],
    randomNumberWords,
  )();
}
function randomNumberWords(): Array<string> {
  const words = [];
  let number = 1 + randomNumber(400);
  while (number > 0) {
    if (number >= 100) {
      words.push(randomIn("ale", "ali"));
      number -= 100;
    } else if (number >= 20) {
      words.push("mute");
      number -= 20;
    } else if (number >= 5) {
      words.push("luka");
      number -= 5;
    } else if (number >= 2) {
      words.push("tu");
      number -= 2;
    } else {
      words.push("wan");
      number--;
    }
  }
  return words;
}
// TODO: nested preverbs and preposition
// TODO: remove export when randomSentence is defined
export function randomPhrase(): Array<string> {
  const modifiers = fill(randomNumber(2), randomModifier).flat();
  const phrase = randomIn(() => {
    const headWord = randomIn(
      () => [randomWord(CONTENT_WORD)],
      () => asAlaQuestion(randomWord(CONTENT_WORD)),
    )();
    return [...headWord, ...modifiers];
  }, () => [...randomNumberWords(), ...modifiers])();
  return randomIn(
    () => phrase,
    () => [...asAlaQuestion(randomWord(PREVERB)), ...phrase],
    () => [randomWord(PREVERB), ...phrase],
  )();
}
