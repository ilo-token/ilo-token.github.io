# ilo Token

A rule-based dictionary-based Toki Pona to English translator that translates
into multiple English outputs showing many possible grammatical and semantic
interpretation of the text. No machine learning involved.

[Try it](https://ilo-token.github.io/)

**It is work in progress!**
[We welcome contributors however!](./CONTRIBUTING.md)

## Dependencies

You'll need the following in order to run commands:

- [Deno](https://deno.com/)

## Building

This builds the distribution code at `./dist/main.js` as minified file ready for
production use, it also builds the source map so contributors can directly debug
the production code.

```
deno task build
```

Before building the distribution code, it builds the dictionary first by
transforming the dictionary into a code at `./dictionary/dictionary.ts`. This
enables faster code startup without dealing with file access or network access.

## Watching

This is similar to [building](#building) but it doesn't minify the code. This
command also watches the codes in `./src/` and `./dictionary/` including the
dictionary and rebuilds whenever there are changes. To stop this command, simply
press Ctrl + C.

```
deno task watch
```

## Running locally with browser

After building or watching, you can directly run `./dist/index.html` with your
browser to test ilo Token. If you wish to start a local server, run
`deno task start`. The stdout will tell you the URL to use.

## Running locally with Deno

This will run a REPL that you can use to test ilo Token. To stop this command,
simply press Escape, Ctrl + D, or Ctrl + C.

```
deno task run
```
