# Contributing

Thank you so much for considering to contribute! Here are useful information
about the pages to get you started. Remember you can always ask for help in the
[discussion](#Discussion) or privately through my email:
[neverrare@proton.me](mailto:neverrare@proton.me)

## [Wiki](https://github.com/ilo-token/ilo-token.github.io/wiki)

The wiki is a place full of useful information for contributors from how the
code works to guidelines for editing the dictionary!

It's not perfect however. If you spot a mistake, please open an issue.

## [Issue](https://github.com/ilo-token/ilo-token.github.io/issues)

The issue page is intended for tracking the development of ilo Token as well as
its wiki. You may open an issue for:

- Bug report
- Feature request
- Fix suggestion to the wiki

Please remember to search first before opening an issue, it might already exist!
Also check the [changelog](./CHANGELOG.md) and open the on-development
changelog, it might be already fixed but hasn't published yet! Duplicate issues
are unnecessary.

Note to maintainer/contributor: When there's a bug discovered, make a test for
it if possible. Use Deno's own testing tools:
[examples](https://github.com/ilo-token/ilo-token.github.io/blob/master/src/translator/test.ts).
Then edit the issue to link the test in following format:

```md
Test: [src/translator/test.ts "verb with adverb"](permalink including the lines)
```

## [Discussion](https://github.com/ilo-token/ilo-token.github.io/discussions)

This GitHub repository have discussion, a dedicated forum page and shall serve
as a public space for ilo Token development. You may open a new page for:

- Suggestion for translation e.g. how it can be improved
- Questions
- Any opinions or suggestions you want to share

Please search first before opening a new page! Duplicate pages are unnecessary.

## [Pull request](https://github.com/ilo-token/ilo-token.github.io/pulls)

Before forking and editing, please claim an issue first or open an issue then
claim it. After that, you can start away. This is necessary to avoid wasted
duplicate efforts.
[The wiki](https://github.com/ilo-token/ilo-token.github.io/wiki) contains
useful information for contributors.

You **don't** have to open a new issue this if:

- It is a contribution to the dictionary
- It is a minor edit e.g. a typo fix

Please don't do the following, we can do this ourselves.

- Updating dependencies

More things to remember:

- Keep the source code as runtime agnostic as possible. We target the browser
  and Deno. This is necessary because we use `deno test`. If a module is
  exclusive to one runtime, add a note above the code:
  `// This code is browser/Deno only`.

(The following aren't strict rules. It's perfectly fine to not follow any of
these, we can adapt.)

- Ensure all the files are formatted: Run `deno fmt`.
- Make sure you don't accidentally make more tests fail: Run
  `deno test --parallel` before and after making changes to the code. Some tests
  may already be failing.
- Make use of linter: Run `deno lint`. If a lint rule is deemed unnecessary and
  more of an annoyance, open an [issue](#issue). We can remove lint rules.

As a thank you for contributing, you'll get a shout out in the changelog!

## Alternative contact options

If you have no github account or want to provide feedback privately, these are
alternative contact options:

- [Google forms](https://docs.google.com/forms/d/e/1FAIpQLSfdDEMbde9mieybZdbZr8haRzNzGsg0BVkuTIzuHaATCdcrlw/viewform?usp=sf_link)
- Email: [neverrare@proton.me](mailto:neverrare@proton.me)

ilo Token have a dedicated space for the following site. Although these sites
themselves serves as a space for broader topics, not just ilo Token.

<!--
- [ma pona pi toki pona Discord Server](https://discord.gg/Byqn5z9)
  ([Thread for ilo Token](https://discord.com/channels/301377942062366741/1053538532993548320)):
  A Discord server for Toki Pona.
  -->

- [Conlangs from Space](https://conlangsfrom.space/)
  ([Forum page for ilo Token](https://conlangsfrom.space/t/ilo-token-a-wip-rule-based-toki-pona-to-english-translator/452)):
  A forum site dedicated for all conlangs, not just Toki Pona.
- [r/ProgrammingLanguages Discord Server](https://discord.gg/4Kjt3ZE)
  ([Channel for ilo Token](https://discord.com/channels/530598289813536771/1224854915214737522)):
  A Discord server for programming language development. While ilo Token isn't a
  programming language, it uses similar techniques found in programming language
  development e.g. parsing.

These are unofficial spaces and are not subject to the
[Contributor Covenant Code of Conduct](https://github.com/ilo-token/ilo-token.github.io/blob/master/CODE_OF_CONDUCT.md).
Instead, each have its own rules and different moderators.
