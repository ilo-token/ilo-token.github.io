import { extractResultError, ResultError } from "../compound.ts";
import { Position, PositionedError } from "../parser/parser_lib.ts";
import { HEADS } from "./parser.ts";
import { Dictionary } from "./type.ts";

type WorkerError =
  | Readonly<
    {
      type: "positioned error";
      errors: ReadonlyArray<Position & Readonly<{ message: string }>>;
    }
  >
  | Readonly<{ type: "other"; error: unknown }>;

function buildOffloaded(source: string): Promise<Dictionary> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.postMessage(source);
    worker.onmessage = (event) => {
      resolve(event.data as Dictionary);
      worker.terminate();
    };
    worker.onerror = (event) => {
      const error = event.error as WorkerError;
      switch (error.type) {
        case "positioned error":
          reject(
            new AggregateError(
              error.errors.map((error) =>
                new PositionedError(error.message, error)
              ),
            ),
          );
          break;
        case "other":
          reject(error.error);
          break;
      }
    };
  });
}
export async function parseDictionary(source: string): Promise<Dictionary> {
  const heads = [...source.matchAll(HEADS)].map((match) => match.index);
  const regionIndices = [...new Array(navigator.hardwareConcurrency).keys()]
    .map((index) => {
      const start = index * source.length / navigator.hardwareConcurrency;
      for (const head of heads) {
        if (start <= head) {
          return head;
        }
      }
      return source.length;
    });
  const jobs = regionIndices.map((index, i) => ({
    index: index,
    job: buildOffloaded(
      source.slice(index, regionIndices[i + 1] ?? source.length),
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
          resultError instanceof PositionedError && resultError.position != null
        ) {
          errors.push(
            new PositionedError(resultError.message, {
              position: job.index + resultError.position.position,
              length: resultError.position.length,
              cause: resultError,
            }),
          );
        } else {
          errors.push(resultError);
        }
      }
      continue;
    }
    if (errors.length === 0) {
      for (const [word, definition] of entries.entries()) {
        if (dictionary.has(word)) {
          errors.push(new ResultError(`duplicate Toki Pona word "${word}"`));
          break;
        } else {
          dictionary.set(word, definition);
        }
      }
    }
  }
  return dictionary;
}
