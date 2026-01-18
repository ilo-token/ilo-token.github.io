import { parseDictionary } from "./parser.ts";

onmessage = (message) => {
  postMessage(parseDictionary(message.data as string));
};
