export interface Clearable {
  clear(): void;
}
export class Cache {
  #caches: Array<Clearable> = [];
  add(cache: Clearable): void {
    this.#caches.push(cache);
  }
  clear(): void {
    for (const cache of this.#caches) {
      cache.clear();
    }
  }
}
export class Lazy<T> implements Clearable {
  #evaluated = false;
  #value: undefined | T;
  #fn: () => T;
  constructor(fn: () => T) {
    this.#fn = fn;
  }
  getValue(): T {
    if (!this.#evaluated) {
      this.#evaluated = true;
      this.#value = this.#fn();
    }
    return this.#value!;
  }
  clear(): void {
    this.#evaluated = false;
  }
}
