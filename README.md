# ilo Token

> The repository uses to old name, it will be renamed on the next update.

An imperfect Toki Pona to English translator that translates into multiple sentences. This emphasizes how broad Toki Pona can be. Everything is hardcoded, no machine learning involved.

[Try it](https://neverrare.github.io/toki-pona-translator/)

## Building

This builds `./main.js` as a minified file ready for production use.

You'll need [Deno](https://deno.com/). Run the following command.

```
deno task build
```

## Watching

This builds `./main.js` as a non-minified file with source mapping, intended for testing and debugging. This command also watches the source codes in `./src/` path and rebuilds `./main.js` whenever there are changes.

You'll need [Deno](https://deno.com/). Run the following command.

```
deno task watch
```

To stop this command, simply press Ctrl + C.

## About the source codes

With exception to `./src/main.ts`, every source codes in `./src/` are environment agnostic. Meaning it can be run on Deno as well. This makes it convenient to directly test codes by using `deno run`.
