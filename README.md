# ilo Token

A rule-based Toki Pona to English translator that translates into multiple sentences. This emphasizes how broad Toki Pona can be. Everything is hardcoded, no machine learning involved.

[Try it](https://neverrare.github.io/ilo-token/)

## Dependencies

You'll need the following in order to run commands:

- [Deno](https://deno.com/)

## Building

This builds `./main.js` as a minified file ready for production use.

```
deno task build
```

## Watching

Before running this command, you'll need to run `deno task build` first. You'll only need to run this command once.

This builds `./main.js` as a non-minified file with source mapping, intended for testing and debugging. This command also watches the source codes in `./src/` path and rebuilds `./main.js` whenever there are changes.

```
deno task watch
```

To stop this command, simply press Ctrl + C.

## Running locally

After building or watching, you can directly run `./index.html` using your favorite browser with some caveat however:

- Settings won't be saved.
- UCSUR characters will display as tofu.

This could be mitigated by making use of local server but I didn't do that, there's little need for that.

## About the source codes

### Runtime agnostic

With exception to `./src/main.ts`, every source codes in `./src/` are runtime agnostic. Meaning it can be run on Deno as well. This makes it convenient to directly test codes by using `deno run` or `deno test`.

### UCSUR included

Some parts of the code make use of sitelen pona UCSUR characters. To display properly, install an UCSUR font and change the font settings on your editor. [UCSUR Installation guides](https://github.com/neroist/sitelen-pona-ucsur-guide/).

Also, take note that UCSUR characters are two characters wide in JavaScript string. Be careful with string and regex manipulation.
