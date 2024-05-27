# ilo Token

A rule-based Toki Pona to English translator that translates into multiple sentences. This emphasizes how broad Toki Pona can be. Everything is hardcoded, no machine learning involved.

[Try it](https://ilo-token.github.io/)

**It is work in progress!** [We welcome contributors however!](./CONTRIBUTING.md)

## Dependencies

You'll need the following in order to run commands:

- [Deno](https://deno.com/)

## Building

This fetches more dependencies needed and builds `./dist/main.js` as a minified file ready for production use.

```
deno task build
```

## Watching

Before running this command, you'll need to run `deno task build` first. This is because `deno task watch` doesn't fetch dependencies. You'll only need to run this command once.

This builds `./dist/main.js` as a non-minified file with source mapping, intended for testing and debugging. This command also watches the source codes in `./src/` path and rebuilds `./dist/main.js` whenever there are changes.

```
deno task watch
```

To stop this command, simply press Ctrl + C.

## Running locally

After building or watching, you can directly run `./dist/index.js` using your favorite browser with some caveat however: UCSUR characters will display as tofu.

This could be mitigated by making use of local server but I didn't do that, there's little need for that.
