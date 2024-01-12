# Toki Pona Translator

An imperfect Toki Pona to English translator that translates into multiple sentences. This emphasizes how broad Toki Pona can be. Everything is hardcoded, no machine learning involved.

[Try it](https://neverrare.github.io/toki-pona-translator/)

## Goals

The goals for this projects are:

- Provide translation that covers most of semantics and meaning of a Toki Pona sentence, but it doesn't have to be complete. This gives translations for users to scan into to give them a feel of how broad a Toki Pona sentence can mean.
- As much as possible, provide translations that are grammatically sound: not just correct but also feels right. For example, "one red thing" sounds better than "red one thing". Due to the difference of English and Toki Pona and nuances of English, the translator may fall severely short for this goal, but we can try!

## Non-goals

- Provide every possible translations.
- Handle every edge cases of Toki Pona grammar. Some edge cases are listed in [limitations] along with others.
- Handle compounds such as translating "tomo tawa" into "vehicle"
- Translate Tokiponized proper word into Untokiponized word such as translating "Manka" into "Minecraft"

Some of these may be lifted in the future.

## Terminology

These are the terminology used in [limitations]. **These are not official grammatical terms**.

- Headword &ndash; A single part of speech that in English, can be a noun, a verb, or an adjective; what the phrase starts with.
- Modifier &ndash; A part of speech that modifies headword or another modifier.
- Phrase &ndash; Headword and its modifiers.
- Preclause &ndash; "taso" or "a" particle before clauses.
- Postclause &ndash; "a" particle after clauses.
- Clause &ndash; Phrase or sentence found before and after "la".
- Proper Word &ndash; Proper name; Capitalized in Toki Pona.

## Limitations

[limitations]: #limitations

The following are currently unrecognized (non-definitive but pedantic). ✏️ means it is a limitation due to being work in progress and it will be lifted soon. Other limitation may also be lifted.

- ✏️ Full sentences: It can only translate phrases for now.
- Non-pu vocabulary with exception to "pu" ("tonsi" is included in the vocabulary)
- Multiple sentences
- Comma as sentence separator (commas are treated as decoration and ignored)
- Proper word as headword
- Having multiple consecutive "a"s inside a sentence (in the beginning or end is fine)
- "taso" as headword ("taso" is currently recognized as modifier or particle at the beginning of a sentence)
- Having no clause before or after "la" particle
- "mi/sina li (pred)" constructions
- "mi/sina (pred) li (pred)" constructions (this would be recognized as "mi (modifier) li (pred)")
- "mi/sina a (pred)" constructions
- Clause with both "li" and "o"
- Clause with multiple "o"s
- Clause with "en" but without predicate ("li" or "o")
- "nanpa" as ordinal particle
- Extended numbering system
- "kepeken" as headword or modifier
- Multiple "pi" on a phrase
- "pi" followed by at most one modifier
- Multiple separate proper word on a single phrase, unless they're separated by "pi" (Proper words spanning multiple words like "musi Manka Sawa" is fine, this limitation refers to something like "musi Manka pona Sawa"; something like "musi Manka pi kule Sawa" is fine)
- proper word followed by "pi"
- "anu" particle
- "la a"
- "en a"
- "li a"
- "o a"
- "e a"
- "pi a"

## New Limitations

The whole code is being rewritten and there will be new different limitations.

<!-- Don't over-complicate, remove the obvious "no one will do this" limitations as well as nonstandard nasin's -->

- ✏️ "a" particle
- ✏️ "anu" particle
- ✏️ "X ala X" constructions
- ✏️ Extended numbering system
- Multiple sentences
- Clause with both "li" and "o"
- "kepeken" as headword or modifier
