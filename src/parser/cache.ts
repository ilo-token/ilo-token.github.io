import { Cache } from "../cache.ts";

export const cache = new Cache();

export function clearCache(): void {
  cache.clear();
}
