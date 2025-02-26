import { Cache } from "../cache.ts";

export const CACHE = new Cache();

export function clearCache(): void {
  CACHE.clear();
}
