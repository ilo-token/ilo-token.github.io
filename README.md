# Toki Pona Translator

An imperfect Toki Pona to English translator that translates into multiple sentences. This emphasizes how broad Toki Pona can be. Everything is hardcoded, no machine learning involved.

[Try it](https://neverrare.github.io/toki-pona-translator/)

## Building

TODO

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
