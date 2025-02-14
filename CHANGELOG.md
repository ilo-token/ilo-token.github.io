# Changelog

<!--
NOTE: Before publishing:
- run `deno task update` to update all dependencies including telo misikeke
- set parameters on `project-data.json`
-->

<details>

<summary>On development changelog</summary>

## 0.4.0 (On development)

The latest on-development version can be accessed by building the source code.
On this on-development version, things can be broken.

ilo Token now has custom dictionary editor! This allows users to customize the
dictionary to their liking. Users can customize existing words and also extend
ilo Token with more non-pu words. It comes with limitations however.
[Read the guidelines for using custom dictionary editor](https://github.com/ilo-token/ilo-token.github.io/wiki/Guidelines-for-editing-dictionary).

Some of the settings may reset. Please reconfigure it again to your liking.
Sorry for the inconvenience. We've decided to reset some of the settings after
refactoring to make the code easier to work with.

- Implement custom dictionary editor.
- Fixed "la" translation.
- Consecutive adverbs are now not shown to avoid ambiguity.
- Sentences ending with long string of punctuation such as "…" and "!?" are now
  recognized.
- Interpunct or middle dot (·) and ideographic period (。) are now recognized as
  sentence separator.
- Recognize multiline text. Newlines are either ignored or treated as sentence
  terminator.
- New setting called multiline input mode. This enables users to insert newline
  on the text box. Ctrl + Enter is used to start translation.
- Fixed UCSUR rendering.
- Fixed ordering issue in Firefox. Thanks akesi Ale!
- Implement advanced parsing settings.
- Long texts (>500) are no longer recognized.

</details>

## 0.3.0

Released 15 Aug 2024

This is a huge update now with better quality translations, configurable
settings, UCSUR support, and expanded vocabulary!

- Reimplement the word "a". This were dropped due to parser rewrite.
- The vocabulary has been expanded to _nimi ku suli_ plus _nimi su!_.
- New "dictionary mode", just enter a single word and ilo Token will output all
  definition from its own dictionary. This also works for particles. To bypass
  this and translate the word as if it is the whole sentence, just add a period.
- Implement UCSUR support! It supports:
  - Cartouche with nasin sitelen kalama
  - Combined glyphs
  - Long glyphs
  - (Deprecated characters and combiners are not supported)
- Implement [nasin nanpa pona](https://sona.pona.la/wiki/nasin_nanpa_pona).
- Implement
  [settings dialog](https://github.com/ilo-token/ilo-token.github.io/wiki/Settings-Help).
- Changes in error messages:
  - All possible errors will now be listed.
  - ilo Token now uses telo misikeke for error messages. This can be disabled
    from the settings.
- Multiline text will no longer be recognized.
- Add icons.

You may not notice this, we take good grammar for granted, but ilo Token now has
generally better quality translations thanks to the following:

- It is now aware determiners are separate from adjectives. So you won't see
  adjectives like "nicely my", since adverbs can't modify determiners.
- It tries to ensure adjectives are in proper order. Yes this matters, it's "big
  red fruit" and not "red big fruit".
- Just like adjectives, determiners are also ordered, but unlike adjectives,
  they're also filtered (some combinations are not shown). You won't see "my
  your animal".
- It is aware of grammatical numbers. So you won't see "2 stick" or "1 sticks".

Inside update (intended for developers):

- Implement lexer and english AST.
- Overhaul dictionary: It is now a separate file with nicer syntax as opposed to
  written inside the code.

## 0.2.2

Released 24 Jan 2024

Update missed links.

## 0.2.1

Released 24 Jan 2024

The project has been renamed to ilo Token. The definition list has been given a
huge overhaul.

- Change name to ilo Token.
- Remove unintended commas, these were found when translating "en" with more
  than 3 phrases.
- Remove copyright and license footer.
- Update definition list:
  - It now uses latest Linku definition as the base.
  - Include verbs for later use.
  - Include interjection for later use.

## 0.2.0

Released 24 Jan 2024

For this version. The whole code has been rewritten. The translator can now
translate few more things! Although it's still not capable of translating full
sentences.

- Implement translator for:
  - Extended numbering system
  - Reduplication
  - _nanpa_ particle
  - _en_ and _anu_
  - _o_ vocative like "jan Koko o"
- Add button for translating, replacing auto-translate when typing.
- (Downgrade) Drop support for "a" particle.
- (Downgrade) Error messages are now very unreliable.
- (Downgrade) Translator is somewhat slower.
- Remove Discord DM as contact option.
- Update translation list:
  - _tonsi_ &ndash; change nouns "transgender", "transgenders", "non-binary",
    and "non-binaries" into "transgender person", "transgender people",
    "non-binary person", and "non-binary people" (I DIDN'T MEAN TO OBJECTIFY
    THEM OMFG I'M SO SORRY 😭😭😭)

Inside update (intended for developers):

- Rewritten whole code to use TypeScript, module, and functional programming.
- Rewritten parser to use parser combinator.
- Add language codes to html.
- New wiki for contributors and thinkerers.
- Overhaul `README.md`, only including build instruction. Information about the
  translator is now moved to wiki.

## 0.1.1

Released 11 Jan 2024

- Update copyright notice.
- Update version number on the page.
- Update contacts to Discord. (from `neverRare#1517` to `never_rare`)

## 0.1.0

Released 11 Jan 2024

- Add "(adjective) in (adjective) way" translation.
- Handle complicated phrase as error.
- Rearrange output to make adjective phrase appear first.
- Add basic "la" translation: "given X, Y" and "if X, then Y".
- Fix multiple _o_ error being triggered when there's only one _o_.
- Update translation list:
  - _ante_ &ndash; change "other" into "different", "different" have broader
    meaning than "other".

## 0.0.2

Released 23 Dec 2022

For this version. Major bugs related to phrase translation has been fixed. The
translation lists has been updated as well.

You may need to force restart the webpage: shift + click the restart button; or
ctrl + shift + R.

- Translator can now put emphasis on whole phrases.
- Fix "(content word) a" not being parsed properly.
- Fix "a (words)" not being parsed properly.
- Proper name now can't modify adjective translations &ndash; translations like
  "good named Nimi" are now removed.
- Untranslatable phrases now handled as untranslatable error.
- New kind of error where the sentence can't be translated but it should be
- Replaced "whoops" error with untranslatable error.
- Having at most one modifier after "pi" is now considered unrecognized error.
- Multiple "pi" is now considered unrecognized error.
- Fix adverbs and adjective not being translated properly.
- Handle multiple proper word as error &ndash; phrases like "jan Sonja pona
  Lang" will be unrecognizable.
- Simplify translation lists:
  - _toki_ &ndash; merge adjectives "speaking" and "writing" as "communicating".
  - _mun_ &ndash; merge "moon", "moons", "star", "stars", "planet" and "planets"
    into "celestial object" and "celestial objects".
  - _pilin_ &ndash; remove "feeling" and "feelings", "emotion" and "emotions"
    seems enough
  - _sona_ &ndash; remove "knowledgeably", doesn't seems to match the definition
    of _sona_.
- Replace translation words:
  - _ante_ &ndash; replace nouns "change" and "changes" with noun "changing".
  - _jan_ &ndash; replace "humanly" with "person-like".
  - _kama_ &ndash; replace "arrival" and "arrivals" with noun "arriving".
  - _pona_ &ndash; replace "properly" with "nicely".
  - _toki_ &ndash; replace "speech" and "speeches" with "communication" and
    "communications".
  - _selo_ &ndash; replace "shape" and "shapes" with "outer form", "boundary",
    and "boundaries".
  - _sewi_ &ndash; replace "up" with "above".
- Add translation words:
  - _anpa_ &ndash; add "under".
  - _lape_ &ndash; add adjective "sleeping".
  - _lawa_ &ndash; add adjective "controlling".
  - _lete_ &ndash; add "uncooked".
  - _mama_ &ndash; add "creators".
  - _musi_ &ndash; add "entertainingly".
  - _moli_ &ndash; add "deadly".
  - _nasa_ &ndash; add "strangely".
  - _pini_ &ndash; add adjective "ended".
  - _suwi_ &ndash; add "cuteness", "cute", and "sweetly".
  - _tan_ &ndash; add "origin".
- Minor fixes and changes.

## 0.0.1

Released 19 Dec 2022

For this version, the word list and translations have been updated. Few words
that have been missed has been added. Translation lists has been updated. This
includes simplifying translation lists such as deduplicating translation words
that have mostly the same meaning, as well as adding more translation words.

The webpage has been updated as well. The color contrast has been updated to be
accessible. The discord link has been updated so it points to the dedicated
channel.

- Start versioning
- Add Nimi Ku Suli custom dictionary for
  [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)
  user
- Change color of hyperlinks and error message to conform to WCAG 2.0 AAA
- Update discord links
- Add footnote
- Add missed words:
  - _ali_ &ndash; "everything", "all", and "completely"
  - _pali_ &ndash; "work" and adjective "working"
  - _palisa_ &ndash; "long hard thing", "long hard things", and "long hard"
  - _poki_ &ndash; "container"
  - _seme_ &ndash; "what" and "which"
  - _uta_ &ndash; "mouth"
- Simplify translation list of words:
  - _ante_ &ndash; remove "different", "other" seems enough
  - _jan_ &ndash; remove "persons", "people" seems enough
  - _kon_ &ndash; remove "essences", "essence" seems enough
  - _kule_ &ndash; remove "colour" and "colours", "color" and "colors" are kept
  - _linja_ &ndash; deduplicate "long flexible"
  - _mama_ &ndash; remove "caring" as noun
  - _ni_ &ndash; remove "these" and "those", "this" and "that" seems enough
  - _pana_ &ndash; remove "emission" and "emissions", these doesn't makes sense
    (smh my head, why did I added these)
  - _pimeja_ &ndash; remove "grey", "gray" is kept
  - _sama_ &ndash; remove "likeness", "similarity" seems enough
  - _sewi_ &ndash; remove "divinities", "divinity" seems enough
  - _sona_ &ndash; remove "knowledges", "knowledge" seems enough
  - _utala_ &ndash; remove "fight", "conflict" seems enough
  - _utala_ &ndash; remove "fighting", conflicting" seems enough
  - _wan_ &ndash; remove "lonliness". remove "single" as adjective, "one" seems
    enough
- Change translations:
  - _wan_ &ndash; change noun "single" to "one"
  - _pona_ &ndash; change "goodly" to "properly"
- Add translation words:
  - _awen_ &ndash; add "staying" as adjective
  - _ante_ &ndash; add "differently"
  - _jaki_ &ndash; add "disgustingly"
  - _kala_ &ndash; add "fish-like"
  - _kalama_ &ndash; add "sounding" as adjective
  - _kama_ &ndash; add "arriving" as adjective
  - _ken_ &ndash; add "possibility" and "possibilities"
  - _kasi_ &ndash; add "plant-like"
  - _lili_ &ndash; add "slightly"
  - _lipu_ &ndash; add "paper"
  - _lon_ &ndash; add "true"
  - _mama_ &ndash; add "creator"
  - _mu_ &ndash; add "mooing" as adjective
  - _pana_ &ndash; add "giving" as noun
  - _pimeja_ &ndash; add "brownness" and "grayness"
  - _pipi_ &ndash; add "bug-like" and "insect-like"
  - _sama_ &ndash; add "equally"
  - _sike_ &ndash; add "cycle" and "repeatedly"
  - _soweli_ &ndash; add "animal-like"
  - _toki_ &ndash; add "speaking" and "writing" as adjectives
  - _waso_ &ndash; add "bird-like"
  - _weka_ &ndash; add "leaving" as adjective
- Fix typos:
  - Fix "femminine" to "feminine"
  - Fix "femminity" to "feminity"
  - Fix "siliness" to "silliness"
  - Fix "trangender" to "transgender"
  - Fix "writting" to "writing"
  - Fix "writtings" to "writings"
- Minor fixes
