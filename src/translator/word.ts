import { repeatWithSpace } from "../misc.ts";
import * as English from "./ast.ts";

export function unemphasized(word: string): English.Word {
  return { word, emphasis: false };
}
export function word(
  word: string,
  reduplicationCount: number,
  emphasis: boolean,
): English.Word {
  return { word: repeatWithSpace(word, reduplicationCount), emphasis };
}
