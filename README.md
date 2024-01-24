# Toki Pona Translator

An imperfect Toki Pona to English translator that translates into multiple sentences. This emphasizes how broad Toki Pona can be. Everything is hardcoded, no machine learning involved.

[Try it](https://neverrare.github.io/toki-pona-translator/)

## Building

You'll need [Deno](https://deno.com/). Run the following command.

```
git clone https://github.com/neverRare/toki-pona-translator.git
cd toki-pona-translator
deno task build
```

Then open `./index.html` using your favorite browser.

Whenever you made changes to `./src/*.ts`, you'll need to run `deno task build` again and refresh the browser. Later I'll make a script to automate this.
