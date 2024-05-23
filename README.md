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

## About the source codes

### Runtime agnostic

With some exception, most source codes in `./src/` are runtime agnostic. Meaning it can be run on Deno as well. This makes it convenient to directly test codes by using `deno run` or `deno test`.

- `main.ts` needs to access the web page DOM. It detects if `document` is available, otherwise it will do nothing.
- `settings.ts` will access DOM and local storage unless you don't use methods marked as browser-only.

If adding `Deno.test`, please use `if (typeof Deno !== "undefined")` so the code can be run on browser. Also use [dynamic import `import(...)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) instead of static import to avoid being included in the bundle.

### UCSUR included

Some parts of the code make use of sitelen pona UCSUR characters. To display properly, install an UCSUR font and change the font settings on your editor. [UCSUR Installation guides](https://github.com/neroist/sitelen-pona-ucsur-guide/).

Oftentimes, you don't need to be able to type UCSUR in the source codes. We reduce UCSUR used in code and prefer to use latin letters instead.

Also, take note that UCSUR characters are two characters wide in JavaScript string. Be careful with string and regex manipulation. If you're using regex, use the [`u` flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicode).

## About the branches

ilo Token has two main branches: "master" and "release". "master" is for development and "release" is for public releases.
