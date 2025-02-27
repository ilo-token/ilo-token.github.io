export interface Clearable {
  clear(): void;
}
export class Cache {
  #caches: Set<WeakRef<Clearable>> = new Set();
  add(cache: Clearable): void {
    this.#caches.add(new WeakRef(cache));
  }
  clear(): void {
    for (const ref of this.#caches) {
      const cache = ref.deref();
      if (cache != null) {
        cache.clear();
      } else {
        this.#caches.delete(ref);
      }
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
    this.#value = undefined;
  }
}
