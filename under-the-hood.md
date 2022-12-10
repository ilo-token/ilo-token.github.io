# Under the hood

## Terminology

- head word &mdash; noun and verb combined in a single part of speech; what the phrase starts with.
- modifier &mdash; a part of speech that modifies head word or another modifier.
- phrase &mdash; head word and its modifiers.
- clause &mdash; a part of sentence without "la" particle, "taso" particle in the beginning, "a" particles in the beginning, and "a" particle in the last when used as exclamation for whole sentence; This is the whole sentence if it doesn't have "la" or is found before and after "la".

## Assumptions

Being a hardcoded translator, few assumptions has to be made; Some of these are extreme cases of Toki Pona grammar:

- One can't doubly emphasis a word: "mi a a" is "me haha", not "_me_" nor "so so me".
- "taso" is only either a modifier or a particle, it can't be used as a head word.
- There must be a clause before and after "la".

If a sentence is not considered valid by this tool, it doesn't mean it is invalid to use outside of this tool. Feel free to speak Toki Pona with your style.
