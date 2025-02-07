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

This fetches more dependencies needed, builds the dictionary, and builds
`./dist/main.js`.

```
deno task build
```

## Watching

Before running this command, you'll need to run `deno task build` first. This is
because `deno task watch` doesn't fetch dependencies. You only need to run it
once.

```
deno task watch
```

This builds `./dist/main.js`. This command also watches the codes in `./src/`
and `./dictionary/` including the dictionary and rebuilds `./dist/main.js`
whenever there are changes. To stop this command, simply press Ctrl + C.

## Running locally with browser

After building or watching, you can directly run `./dist/index.html` with your
browser to test ilo Token. If you wish to start a local server, run
`deno task start`. The stdout will tell you the URL to use.

## Running locally with Deno

Before running this command, you'll need to run `deno task build` first to fetch
dependencies and to build the dictionary. You only need to run it once unless
you made changes to the dictionary.

```
deno task run
```

This will run a REPL that you can use to test ilo Token. To stop this command,
simply press Escape or Ctrl + C.
