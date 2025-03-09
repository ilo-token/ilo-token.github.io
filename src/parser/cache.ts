import { ClearableCacheSet } from "../cache.ts";

export const cache = new ClearableCacheSet();

// This needs to be called whenever settings or custom dictionary has changed
export function clearCache(): void {
  cache.clear();
}
