# Toki Pona Translator

An imperfect Toki Pona to English translator that translates into multiple sentences. This emphasizes how broad Toki Pona can be.

## Goals

The goals for this projects are:

- Provide translation that covers most of semantics and meaning of a Toki Pona sentence, but it doesn't have to be complete. This gives translations for users to scan into to give them a feel of how broad a Toki Pona sentence can mean.
- As much as possible, provide translations that are grammatically sound: not just correct but also feels right. For example, "red one thing" sounds off than "one red thing". Due to the difference of English and Toki Pona and nuances of English, the translator may fall severely short for this goal, but we can try!

## Non-goals

- Provide every possible translations.
- Handle every edge cases of Toki Pona grammar. Some edge cases are listed in [limitations] along with others.
- Handle compounds such as translating "tomo tawa" into "vehicle"
- Translate Tokiponized proper word into what it was before such as translating "Manka" into "Minecraft"

Some of these may be lifted in the future.

## Terminology

These are the terminology used in [limitations]

- Headword &mdash; A single part of speech that in English, can be a noun, a verb, or an adjective; what the phrase starts with.
- Modifier &mdash; A part of speech that modifies headword or another modifier.
- Phrase &mdash; Headword and its modifiers.
- Clause &mdash; A part of sentence without "la" particle, "taso" particle in the beginning, "a" particles in the beginning and the end; found before and after "la", or the sentence itself without particles around it if it doesn't have "la".

## Limitations

[limitations]: #limitations

The following are currently unrecognized (non-definitive but pedantic).

- Non-pu vocabulary with exception to "pu" ("tonsi" is included in the vocabulary)
- Multiple sentences
- Comma as sentence separator (commas are treated as decoration and ignored)
- Having multiple consecutive "a"s inside a sentence (in the beginning or end is fine)
- "taso" as headword ("taso" is currently recognized as modifier or particle at the beginning of a sentence)
- Having no clause before or after "la" particle
- "mi/sina li (pred)" constructions
- "mi/sina (pred) li (pred)" constructions (this would be recognized as "mi (modifier) li (pred)")
- "mi/sina a (pred)" constructions (this would be recognized as "mi a (modifier)" phrase)
- Clause with both "li" and "o"
- Clause with multiple "o"s
- Clause with "en" but without predicate ("li" or "o")
- "nanpa" as ordinal particle
- Extended numbering system
- "sama" as headword
- "kepeken" as headword
- Multiple "pi" on a phrase
- "anu" particle
- "la a"
- "en a"
- "li a"
- "o a"
- "e a"
- "pi a"

Some of these may be lifted in the future.
