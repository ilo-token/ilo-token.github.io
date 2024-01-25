# Changelog

You may need to force restart the page in order to use the latest version: shift + click the restart button; or ctrl + shift + R.

## 0.2.1

The definition list has been given a huge overhaul.

- Update definition list:
  - It now uses latest Linku definition as a base.
  - Include verbs for later use.
  - Include interjection for later use.

## 0.2.0

For this version. The whole code has been rewritten. The translator can now translate few more things! Although it's still not capable of translating full sentences.

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
  - _tonsi_ &ndash; change nouns "transgender", "transgenders", "non-binary", and "non-binaries" into "transgender person", "transgender people", "non-binary person", and "non-binary people" (I DIDN'T MEAN TO OBJECTIFY THEM OMFG I'M SO SORRY 😭😭😭)

Inside update (intended for developers):

- Rewritten whole code to use TypeScript, module, and functional programming.
- Rewritten parser to use parser combinator.
- Add language codes to html.
- New wiki for contributors and thinkerers.
- Overhaul `README.md`, only including build instruction. Information about the translator is now moved to wiki.

## 0.1.1

- Update copyright notice.
- Update version number on the page.
- Update contacts to Discord. (from `neverRare#1517` to `never_rare`)

## 0.1.0

- Add "(adjective) in (adjective) way" translation.
- Handle complicated phrase as error.
- Rearrange output to make adjective phrase appear first.
- Add basic "la" translation: "given X, Y" and "if X, then Y".
- Fix multiple _o_ error being triggered when there's only one _o_.
- Update translation list:
  - _ante_ &ndash; change "other" into "different", "different" have broader meaning than "other".

## 0.0.2

For this version. Major bugs related to phrase translation has been fixed. The translation lists has been updated as well.

You may need to force restart the webpage: shift + click the restart button; or ctrl + shift + R.

- Translator can now put emphasis on whole phrases.
- Fix "(content word) a" not being parsed properly.
- Fix "a (words)" not being parsed properly.
- Proper name now can't modify adjective translations &ndash; translations like "good named Nimi" are now removed.
- Untranslatable phrases now handled as untranslatable error.
- New kind of error where the sentence can't be translated but it should be
- Replaced "whoops" error with untranslatable error.
- Having at most one modifier after "pi" is now considered unrecognized error.
- Multiple "pi" is now considered unrecognized error.
- Fix adverbs and adjective not being translated properly.
- Handle multiple proper word as error &ndash; phrases like "jan Sonja pona Lang" will be unrecognizable.
- Simplify translation lists:
  - _toki_ &ndash; merge adjectives "speaking" and "writing" as "communicating".
  - _mun_ &ndash; merge "moon", "moons", "star", "stars", "planet" and "planets" into "celestial object" and "celestial objects".
  - _pilin_ &ndash; remove "feeling" and "feelings", "emotion" and "emotions" seems enough
  - _sona_ &ndash; remove "knowledgeably", doesn't seems to match the definition of _sona_.
- Replace translation words:
  - _ante_ &ndash; replace nouns "change" and "changes" with noun "changing".
  - _jan_ &ndash; replace "humanly" with "person-like".
  - _kama_ &ndash; replace "arrival" and "arrivals" with noun "arriving".
  - _pona_ &ndash; replace "properly" with "nicely".
  - _toki_ &ndash; replace "speech" and "speeches" with "communication" and "communications".
  - _selo_ &ndash; replace "shape" and "shapes" with "outer form", "boundary", and "boundaries".
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

For this version, the word list and translations have been updated. Few words that have been missed has been added. Translation lists has been updated. This includes simplifying translation lists such as deduplicating translation words that have mostly the same meaning, as well as adding more translation words.

The webpage has been updated as well. The color contrast has been updated to be accessible. The discord link has been updated so it points to the dedicated channel.

- Start versioning
- Add Nimi Ku Suli custom dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) user
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
  - _pana_ &ndash; remove "emission" and "emissions", these doesn't makes sense (smh my head, why did I added these)
  - _pimeja_ &ndash; remove "grey", "gray" is kept
  - _sama_ &ndash; remove "likeness", "similarity" seems enough
  - _sewi_ &ndash; remove "divinities", "divinity" seems enough
  - _sona_ &ndash; remove "knowledges", "knowledge" seems enough
  - _utala_ &ndash; remove "fight", "conflict" seems enough
  - _utala_ &ndash; remove "fighting", conflicting" seems enough
  - _wan_ &ndash; remove "lonliness". remove "single" as adjective, "one" seems enough
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
