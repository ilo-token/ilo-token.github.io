# Under the hood

## Terminology

- head word &mdash; a single part of speech that in english, can be a noun, a verb, or an adjective; what the phrase starts with.
- modifier &mdash; a part of speech that modifies head word or another modifier.
- phrase &mdash; head word and its modifiers.
- clause &mdash; a part of sentence without "la" particle, "taso" particle in the beginning, "a" particles in the beginning, and "a" particle in the last when used as exclamation for whole sentence; found before and after "la", or the sentence itself without particles around it if it doesn't have "la".

## Assumptions

Few assumptions has been made for this tool:

- One can't doubly emphasis a word: "mi a a" is "me haha", not "_me_" nor "so so me".
- There can't be multiple consecutive "a"s in the middle of a sentence.
- "taso" is only either a modifier or a particle, it can't be used as a head word.
- "taso" is only a particle if it is in the start of a sentence. Else where, it must be a modifier.
- There must be a clause before and after "la".
- If a clause starts with "mi" or "sina", it cannot contain "li" particle.
- A clause can't contain both "li" and "o"
- A clause can't contain multiple "o"s

Some of these assumptions may be lifted in the future.

If a sentence is not considered valid by this tool, it doesn't mean it is invalid to use outside of this tool. Feel free to speak Toki Pona with your style.

These assumptions sound so prescriptivist lmao.
