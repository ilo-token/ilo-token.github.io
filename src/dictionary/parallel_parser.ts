// This code is Deno only (it uses the new `using` keyword)

import { extractResultError, ResultError } from "../compound.ts";
import { Position, PositionedError } from "../parser/parser_lib.ts";
import { HEADS } from "./parser.ts";
import { Dictionary } from "./type.ts";

type WorkerError =
  | Readonly<{
    type: "result error";
    errors: ReadonlyArray<
      Readonly<{ message: string; position: null | Position }>
    >;
  }>
  | Readonly<{ type: "other"; error: unknown }>;

class ParserWorker {
  #worker = new Worker(
    new URL("./worker.ts", import.meta.url),
    { type: "module" },
  );
  [Symbol.dispose]() {
    this.#worker.terminate();
  }
  parse(source: string): Promise<Dictionary> {
    return new Promise((resolve, reject) => {
      const messageCallback = (event: MessageEvent) => {
        resolve(event.data as Dictionary);
        this.#worker.removeEventListener("message", messageCallback);
      };
      this.#worker.addEventListener("message", messageCallback);
      const errorCallback = (event: ErrorEvent) => {
        const error = event.error as WorkerError;
        switch (error.type) {
          case "result error":
            reject(
              new AggregateError(
                error.errors.map((error) =>
                  new PositionedError(
                    error.message,
                    { position: error.position ?? undefined },
                  )
                ),
              ),
            );
            break;
          case "other":
            reject(error.error);
            break;
        }
        this.#worker.removeEventListener("error", errorCallback);
      };
      this.#worker.addEventListener("error", errorCallback);
      this.#worker.postMessage(source);
    });
  }
}
export class Parser {
  #workers = new Array(navigator.hardwareConcurrency)
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
    const jobs = regionPositions.map((position, i) => ({
      position,
      job: this.#workers[i].parse(
        source.slice(position, regionPositions[i + 1] ?? source.length),
      ),
    }));
    const dictionary: Dictionary = new Map();
    const errors: Array<ResultError> = [];
    for (const job of jobs) {
      let entries: Dictionary;
      try {
        // deno-lint-ignore no-await-in-loop
        entries = await job.job;
      } catch (error) {
        for (const resultError of extractResultError(error)) {
          if (
            resultError instanceof PositionedError &&
            resultError.position != null
          ) {
            errors.push(
              new PositionedError(resultError.message, {
                position: {
                  position: job.position + resultError.position.position,
                  length: resultError.position.length,
                },
                cause: resultError,
              }),
            );
          } else {
            errors.push(resultError);
          }
        }
        continue;
      }
      for (const [word, definition] of entries.entries()) {
        if (dictionary.has(word)) {
          errors.push(new ResultError(`duplicate Toki Pona word "${word}"`));
        } else {
          dictionary.set(word, definition);
        }
      }
    }
    if (errors.length === 0) {
      return dictionary;
    } else {
      throw new AggregateError(errors);
    }
  }
}
