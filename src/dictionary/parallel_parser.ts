// This code is Deno only (it uses the new `using` keyword)

import { extractResultError, ResultError } from "../compound.ts";
import { mapNullable } from "../misc/misc.ts";
import { Position, PositionedError } from "../parser/parser_lib.ts";
import { HEADS } from "./parser.ts";
import { Dictionary } from "./type.ts";

type Result =
  | Readonly<{ type: "value"; value: Dictionary }>
  | Readonly<{
    type: "error";
    error: ReadonlyArray<{ message: string; position: null | Position }>;
  }>;

class ParserWorker {
  readonly #worker = new Worker(
    new URL("./worker.ts", import.meta.url),
    { type: "module" },
  );
  #cachedSource = "";
  #cachedDictionary: Dictionary = new Map();
  [Symbol.dispose]() {
    this.#worker.terminate();
  }
  #rawParse(position: number, source: string): Promise<Dictionary> {
    return new Promise((resolve, reject) => {
      const messageCallback = (event: MessageEvent) => {
        const result = event.data as Result;
        switch (result.type) {
          case "value":
            resolve(result.value);
            this.#cachedSource = source;
            this.#cachedDictionary = result.value;
            break;
          case "error":
            reject(
              new AggregateError(
                result.error.map((result) =>
                  new PositionedError(result.message, {
                    position: mapNullable(
                      result.position,
                      ({ position: offsetPosition, length }) => ({
                        position: position + offsetPosition,
                        length,
                      }),
                    ) ?? undefined,
                  })
                ),
              ),
            );
            break;
        }
        this.#worker.removeEventListener("message", messageCallback);
      };
      this.#worker.addEventListener("message", messageCallback);
      const errorCallback = (event: ErrorEvent) => {
        reject(event.error);
        this.#worker.removeEventListener("error", errorCallback);
      };
      this.#worker.addEventListener("error", errorCallback);
      this.#worker.postMessage(source);
    });
  }
  async parse(position: number, source: string): Promise<Dictionary> {
    if (this.#cachedSource === source) {
      return this.#cachedDictionary;
    } else {
      return await this.#rawParse(position, source);
    }
  }
}
export class Parser {
  readonly #workers = new Array(navigator.hardwareConcurrency)
    .fill(undefined)
    .map(() => new ParserWorker());
  [Symbol.dispose](): void {
    using stack = new DisposableStack();
    for (const worker of this.#workers) {
      stack.use(worker);
    }
  }
  async parse(source: string): Promise<Dictionary> {
    const heads = [...source.matchAll(HEADS)].map((match) => match.index);
    const regionPositions = [...new Array(this.#workers.length).keys()]
      .map((i) => {
        const start = i * source.length / this.#workers.length;
        for (const head of heads) {
          if (start <= head) {
            return head;
          }
        }
        return source.length;
      });
    const jobs = await Promise.allSettled(
      regionPositions.map((position, i) =>
        this.#workers[i].parse(
          position,
          source.slice(position, regionPositions[i + 1] ?? source.length),
        )
      ),
    );
    const dictionary: Dictionary = new Map();
    const errors: Array<ResultError> = [];
    for (const job of jobs) {
      switch (job.status) {
        case "fulfilled":
          for (const [word, definition] of job.value.entries()) {
            if (dictionary.has(word)) {
              errors.push(
                new ResultError(`duplicate Toki Pona word "${word}"`),
              );
            } else {
              dictionary.set(word, definition);
            }
          }
          break;
        case "rejected":
          errors.push(...extractResultError(job.reason));
      }
    }
    if (errors.length === 0) {
      return dictionary;
    } else {
      throw new AggregateError(errors);
    }
  }
}
