import { ClearableCache } from "../cache.ts";

export const cache = new ClearableCache();

// This needs to be called whenever settings or custom dictionary has changed
export function clearCache(): void {
  cache.clear();
}
