import { repeatWithSpace } from "../misc.ts";
import * as English from "./ast.ts";

export function unemphasized(word: string): English.Word {
  return { word, emphasis: false };
}
export function word(
  options: Readonly<{
    word: string;
    reduplicationCount: number;
    emphasis: boolean;
  }>,
): English.Word {
  const { word, reduplicationCount, emphasis } = options;
  return { word: repeatWithSpace(word, reduplicationCount), emphasis };
}
