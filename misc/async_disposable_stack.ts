// This code is Deno only

// TODO: remove this after Deno supports it
export class AsyncDisposableStack implements AsyncDisposable {
  #callbacks: Array<() => Promise<void>> = [];
  defer(onDisposeAsync: () => Promise<void>): void {
    this.#callbacks.push(onDisposeAsync);
  }
  move(): AsyncDisposableStack {
    const newStack = new AsyncDisposableStack();
    newStack.#callbacks = this.#callbacks;
    this.#callbacks = [];
    return newStack;
  }
  async [Symbol.asyncDispose](): Promise<void> {
    const errors = [];
    for (const callback of [...this.#callbacks].reverse()) {
      try {
        await callback();
      } catch (error) {
        errors.push(error);
      }
    }
    this.#callbacks = [];
    switch (errors.length) {
      case 0:
        break;
      case 1:
        throw errors[0];
      default:
        throw AggregateError(errors);
    }
  }
}
