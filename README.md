# ilo Token

A rule-based dictionary-based Toki Pona to English translator that translates into multiple English outputs showing many possible grammatical and semantic interpretation of the text. No machine learning involved.

[Try it](https://ilo-token.github.io/)

**It is work in progress!** [We welcome contributors however!](./CONTRIBUTING.md)

## Dependencies

You'll need the following in order to run commands:

- [Deno](https://deno.com/)

## Building

This fetches more dependencies needed and builds `./dist/main.js`.

```
deno task build
```

## Watching

Before running this command, you'll need to run `deno task build` first. This is because `deno task watch` doesn't fetch dependencies.

This builds `./dist/main.js`. This command also watches the source codes in `./src/` path and rebuilds `./dist/main.js` whenever there are changes.

```
deno task watch
```

To stop this command, simply press Ctrl + C.

## Running locally

After building or watching, run `deno task start` to start a local server. The stdout will tell you the URL to use to test the local copy of ilo Token.
