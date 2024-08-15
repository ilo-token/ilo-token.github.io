import { parse } from "./ast-parser.ts";
import * as TokiPona from "./ast.ts";
import * as English from "./english-ast.ts";
import { TodoError } from "./error.ts";
import { nullableAsArray, repeat, repeatWithSpace } from "./misc.ts";
import { Output } from "./output.ts";
import { settings } from "./settings.ts";
import { DICTIONARY } from "dictionary/dictionary.ts";
import * as Dictionary from "dictionary/type.ts";

const CONJUNCTION = { "and conjunction": "and", "anu": "or" } as const;

function condense(first: string, second: string): string {
  if (first === second) {
    return first;
  } else if (
    second.length > first.length && second.slice(0, first.length) === first
  ) {
    return `${first}(${second.slice(first.length)})`;
  } else {
    return `${first}/${second}`;
  }
}
function condenseVerb(present: string, past: string): string {
  const [first, ...rest] = present.split(" ");
  const second = past.split(" ")[0];
  return [condense(first, second), ...rest].join(" ");
}
function unemphasized(word: string): English.Word {
  return { word, emphasis: false };
}
function findNumber(
  determiner: Array<English.Determiner>,
): null | Dictionary.Quantity {
  const quantity = determiner.map((determiner) => determiner.number);
  if (quantity.every((quantity) => quantity === "both")) {
    return "both";
  } else if (
    quantity.every((quantity) => quantity !== "plural") &&
    quantity.some((quantity) => quantity === "singular")
  ) {
    return "singular";
  } else if (
    quantity.every((quantity) => quantity !== "singular") &&
    quantity.some((quantity) => quantity === "plural")
  ) {
    return "plural";
  } else {
    return null;
  }
}
function nounForms(
  singular: undefined | null | string,
  plural: undefined | null | string,
  determinerNumber: Dictionary.Quantity,
): Output<{ noun: string; number: English.Quantity }> {
  switch (determinerNumber) {
    case "both":
      switch (settings.get("number-settings")) {
        case "both":
          return new Output([
            ...nullableAsArray(singular)
              .map((noun) => ({ noun, number: "singular" as const })),
            ...nullableAsArray(plural)
              .map((noun) => ({ noun, number: "plural" as const })),
          ]);
        case "condensed":
          if (singular != null && plural != null) {
            return new Output([{
              noun: condense(singular, plural),
              number: "condensed",
            }]);
          }
          // fallthrough
        case "default only":
          if (singular != null) {
            return new Output([{ noun: singular, number: "singular" }]);
          } else {
            return new Output([{ noun: plural!, number: "plural" }]);
          }
      }
      // unreachable
      // fallthrough
    case "singular":
      return new Output(nullableAsArray(singular))
        .map((noun) => ({ noun, number: "singular" as const }));
    case "plural":
      return new Output(nullableAsArray(plural))
        .map((noun) => ({ noun, number: "plural" as const }));
  }
}
function simpleNounForms(
  singular: undefined | null | string,
  plural: undefined | null | string,
): Output<string> {
  return nounForms(singular, plural, "both").map((noun) => noun.noun);
}
function noun(
  definition: Dictionary.Noun,
  emphasis: boolean,
  count: number,
): Output<English.NounPhrase> {
  const engDeterminer = Output.combine(
    ...definition.determiner
      .map((definition) => determiner(definition, false, 1)),
  );
  const engAdjective = Output.combine(
    ...definition.adjective
      .map((definition) => adjective(definition, null, 1)),
  );
  return Output.combine(engDeterminer, engAdjective)
    .flatMap(([determiner, adjective]) => {
      const number = findNumber(determiner);
      if (number == null) {
        return new Output();
      }
      return nounForms(definition.singular, definition.plural, number)
        .map((noun) => ({
          type: "simple",
          determiner,
          adjective,
          noun: { word: repeatWithSpace(noun.noun, count), emphasis },
          number: noun.number,
          postCompound: null,
          postAdjective: definition.postAdjective,
          preposition: [],
          emphasis: false,
        }));
    });
}
function determiner(
  definition: Dictionary.Determiner,
  emphasis: boolean,
  count: number,
): Output<English.Determiner> {
  return simpleNounForms(definition.determiner, definition.plural)
    .map((determiner) => ({
      kind: definition.kind,
      determiner: {
        word: repeatWithSpace(determiner, count),
        emphasis,
      },
      number: definition.number,
    }));
}
function adjective(
  definition: Dictionary.Adjective,
  emphasis: null | TokiPona.Emphasis,
  count: number,
): Output<English.AdjectivePhrase & { type: "simple" }> {
  let so: null | string;
  if (emphasis == null) {
    so = null;
  } else {
    switch (emphasis.type) {
      case "word":
        so = "so";
        break;
      case "long word":
        so = `s${repeat("o", emphasis.length)}`;
        break;
    }
  }
  return new Output([
    ...nullableAsArray(so!).map((so) => ({ emphasis: false, so })),
    { emphasis: emphasis != null, so: null },
  ])
    .map(({ emphasis, so }) => ({
      type: "simple",
      kind: definition.kind,
      adverb: [...definition.adverb, ...nullableAsArray(so)].map(unemphasized),
      adjective: {
        word: repeatWithSpace(definition.adjective, count),
        emphasis,
      },
      emphasis: false,
    }));
}
function compoundAdjective(
  definition: Dictionary.Definition & { type: "compound adjective" },
  emphasis: null | TokiPona.Emphasis,
): Output<English.AdjectivePhrase & { type: "compound" }> {
  return Output.combine(
    ...definition.adjective
      .map((definition) => adjective(definition, emphasis, 1)),
  )
    .map((adjective) => ({
      type: "compound",
      conjunction: "and",
      adjective,
      emphasis: false,
    }));
}
type ModifierTranslation =
  | { type: "noun"; noun: English.NounPhrase }
  | { type: "noun preposition"; noun: English.NounPhrase; preposition: string }
  | { type: "adjective"; adjective: English.AdjectivePhrase }
  | { type: "determiner"; determiner: English.Determiner }
  | { type: "adverb"; adverb: English.Word }
  | { type: "name"; name: string }
  | { type: "in position phrase"; noun: English.NounPhrase };
function defaultModifier(word: TokiPona.WordUnit): Output<ModifierTranslation> {
  const emphasis = word.emphasis != null;
  switch (word.type) {
    case "number": {
      let number: English.Quantity;
      if (word.number === 1) {
        number = "singular";
      } else {
        number = "plural";
      }
      return new Output([{
        type: "determiner",
        determiner: {
          determiner: { word: `${word.number}`, emphasis },
          kind: "numeral",
          number,
        },
      } as ModifierTranslation]);
    }
    case "x ala x":
      return new Output();
    case "default":
    case "reduplication": {
      let count: number;
      switch (word.type) {
        case "default":
          count = 1;
          break;
        case "reduplication":
          count = word.count;
          break;
      }
      return new Output(DICTIONARY[word.word]).flatMap((definition) => {
        switch (definition.type) {
          case "noun":
            return noun(definition, emphasis, count)
              .map((noun) =>
                ({
                  type: "noun",
                  noun,
                }) as ModifierTranslation
              );
          case "noun preposition":
            return noun(definition.noun, emphasis, count)
              .map((noun) =>
                ({
                  type: "noun preposition",
                  noun,
                  preposition: definition.preposition,
                }) as ModifierTranslation
              );
          case "personal pronoun":
            return simpleNounForms(
              definition.singular?.object,
              definition.plural?.object,
            )
              .map((pronoun) =>
                ({
                  type: "noun",
                  noun: {
                    type: "simple",
                    determiner: [],
                    adjective: [],
                    noun: {
                      word: repeatWithSpace(pronoun, count),
                      emphasis,
                    },
                    number: "both",
                    postCompound: null,
                    postAdjective: null,
                    preposition: [],
                    emphasis: false,
                  },
                }) as ModifierTranslation
              );
          case "determiner":
            return determiner(definition, word.emphasis != null, count)
              .map((determiner) =>
                ({
                  type: "determiner",
                  determiner,
                }) as ModifierTranslation
              );
          case "adjective":
            return adjective(definition, word.emphasis, count)
              .map((adjective) =>
                ({
                  type: "adjective",
                  adjective,
                }) as ModifierTranslation
              );
          case "compound adjective":
            if (word.type === "default") {
              return compoundAdjective(definition, word.emphasis)
                .map((adjective) =>
                  ({
                    type: "adjective",
                    adjective,
                  }) as ModifierTranslation
                );
            } else {
              return new Output();
            }
          case "adverb":
            return new Output([{
              type: "adverb",
              adverb: {
                word: repeatWithSpace(definition.adverb, count),
                emphasis,
              },
            } as ModifierTranslation]);
          default:
            return new Output();
        }
      });
    }
  }
}
function modifier(modifier: TokiPona.Modifier): Output<ModifierTranslation> {
  switch (modifier.type) {
    case "default":
      return defaultModifier(modifier.word);
    case "proper words":
      return new Output([{ type: "name", name: modifier.words }]);
    case "pi":
      return phrase(modifier.phrase, "object")
        .filter((modifier) =>
          modifier.type !== "noun" || modifier.noun.type !== "simple" ||
          modifier.noun.preposition.length === 0
        )
        .filter((modifier) =>
          modifier.type != "adjective" || modifier.inWayPhrase == null
        );
    case "nanpa":
      return phrase(modifier.phrase, "object").filterMap((phrase) => {
        if (
          phrase.type === "noun" &&
          (phrase.noun as English.NounPhrase & { type: "simple" })
              .preposition.length === 0
        ) {
          return {
            type: "in position phrase",
            noun: {
              type: "simple",
              determiner: [],
              adjective: [],
              noun: {
                word: "position",
                emphasis: modifier.nanpa.emphasis != null,
              },
              number: "singular",
              postCompound: phrase.noun,
              postAdjective: null,
              preposition: [],
              emphasis: false,
            },
          } as ModifierTranslation;
        } else {
          return null;
        }
      });
    case "quotation":
      return new Output(new TodoError(`translation of ${modifier.type}`));
  }
}
type MultipleModifierTranslation =
  | {
    type: "adjectival";
    nounPreposition: null | { noun: English.NounPhrase; preposition: string };
    determiner: Array<English.Determiner>;
    adjective: Array<English.AdjectivePhrase>;
    name: null | string;
    ofPhrase: null | English.NounPhrase;
    inPositionPhrase: null | English.NounPhrase;
  }
  | {
    type: "adverbial";
    adverb: Array<English.Word>;
    inWayPhrase: null | English.NounPhrase;
  };
function multipleModifiers(
  modifiers: Array<TokiPona.Modifier>,
): Output<MultipleModifierTranslation> {
  return Output
    .combine(...modifiers.map(modifier))
    .flatMap((modifiers) => {
      const noun = modifiers
        .filter((modifier) => modifier.type === "noun")
        .map((modifier) => modifier.noun);
      const nounPreposition = modifiers
        .filter((modifier) => modifier.type === "noun preposition");
      const determiner = modifiers
        .filter((modifier) => modifier.type === "determiner")
        .map((modifier) => modifier.determiner);
      const adjective = modifiers
        .filter((modifier) => modifier.type === "adjective")
        .map((modifier) => modifier.adjective);
      const adverb = modifiers
        .filter((modifier) => modifier.type === "adverb")
        .map((modifier) => modifier.adverb);
      const name = modifiers
        .filter((modifier) => modifier.type === "name")
        .map((modifier) => modifier.name);
      const inPositionPhrase = modifiers
        .filter((modifier) => modifier.type === "in position phrase")
        .map((modifier) => modifier.noun);
      let adjectival: Output<MultipleModifierTranslation>;
      if (
        noun.length <= 1 &&
        nounPreposition.length <= 1 &&
        adverb.length === 0 &&
        name.length <= 1 &&
        inPositionPhrase.length <= 1 &&
        (noun.length === 0 || inPositionPhrase.length === 0)
      ) {
        adjectival = new Output([{
          type: "adjectival",
          nounPreposition: nounPreposition[0] ?? null,
          determiner,
          adjective,
          name: name[0] ?? null,
          ofPhrase: noun[0] ?? null,
          inPositionPhrase: inPositionPhrase[0] ?? null,
        } as MultipleModifierTranslation]);
      } else {
        adjectival = new Output();
      }
      let adverbial: Output<MultipleModifierTranslation>;
      if (
        noun.length === 0 &&
        nounPreposition.length === 0 &&
        determiner.length === 0 &&
        adjective.length <= 1 &&
        name.length === 0 &&
        inPositionPhrase.length === 0
      ) {
        let inWayPhrase: null | English.NounPhrase;
        if (adjective.length > 0) {
          inWayPhrase = {
            type: "simple",
            determiner: [],
            adjective,
            noun: { word: "way", emphasis: false },
            number: "singular",
            postCompound: null,
            postAdjective: null,
            preposition: [],
            emphasis: false,
          };
        } else {
          inWayPhrase = null;
        }
        adverbial = new Output([{
          type: "adverbial",
          adverb,
          inWayPhrase,
        } as MultipleModifierTranslation]);
      } else {
        adverbial = new Output();
      }
      return Output.concat(adjectival, adverbial);
    });
}
function fixDeterminer(
  determiner: Array<English.Determiner>,
): null | Array<English.Determiner> {
  const negative = determiner
    .filter((determiner) => determiner.kind === "negative");
  const first = determiner
    .filter((determiner) =>
      ["article", "demonstrative", "possessive"].includes(determiner.kind)
    );
  const distributive = determiner
    .filter((determiner) => determiner.kind === "distributive");
  const interrogative = determiner
    .filter((determiner) => determiner.kind === "interrogative");
  const numerical = determiner
    .filter((determiner) =>
      determiner.kind === "numeral" || determiner.kind === "quantifier"
    );
  if (
    negative.length > 1 || first.length > 1 || distributive.length > 1 ||
    interrogative.length > 1 || numerical.length > 1 ||
    negative.length > 0 && interrogative.length > 0
  ) {
    return null;
  } else {
    return [
      ...negative,
      ...first,
      ...distributive,
      ...interrogative,
      ...numerical,
    ];
  }
}
function rankAdjective(kind: Dictionary.AdjectiveType): number {
  return [
    "opinion",
    "size",
    "physical quality",
    "age",
    "color",
    "origin",
    "material",
    "qualifier",
  ]
    .indexOf(kind);
}
function fixAdjective(
  adjective: Array<English.AdjectivePhrase>,
): Array<English.AdjectivePhrase> {
  return (adjective
    .flatMap((adjective) => {
      switch (adjective.type) {
        case "simple":
          return [adjective];
        case "compound":
          return adjective.adjective;
      }
    }) as Array<English.AdjectivePhrase & { type: "simple" }>)
    .sort((a, b) => rankAdjective(a.kind) - rankAdjective(b.kind));
}
type WordUnitTranslation =
  | {
    type: "noun";
    determiner: Array<English.Determiner>;
    adjective: Array<English.AdjectivePhrase>;
    singular: null | string;
    plural: null | string;
    postAdjective: null | { adjective: string; name: string };
  }
  | {
    type: "adjective";
    adjective: English.AdjectivePhrase;
  };
function wordUnit(
  wordUnit: TokiPona.WordUnit,
  place: "subject" | "object",
): Output<WordUnitTranslation> {
  switch (wordUnit.type) {
    case "number":
      return new Output([{
        type: "noun",
        determiner: [],
        adjective: [],
        singular: `${wordUnit.number}`,
        plural: null,
        postAdjective: null,
      } as WordUnitTranslation]);
    case "x ala x":
      return new Output();
    case "default":
    case "reduplication": {
      let count: number;
      switch (wordUnit.type) {
        case "default":
          count = 1;
          break;
        case "reduplication":
          count = wordUnit.count;
          break;
      }
      return new Output(DICTIONARY[wordUnit.word])
        .flatMap((definition) => {
          switch (definition.type) {
            case "noun": {
              const engDeterminer = Output
                .combine(...definition.determiner
                  .map((definition) => determiner(definition, false, 1)));
              const engAdjective = Output
                .combine(...definition.adjective
                  .map((definition) => adjective(definition, null, 1)));
              return Output.combine(engDeterminer, engAdjective)
                .map(([determiner, adjective]) =>
                  ({
                    type: "noun",
                    determiner,
                    adjective,
                    singular: definition.singular,
                    plural: definition.plural,
                    postAdjective: definition.postAdjective,
                  }) as WordUnitTranslation
                );
            }
            case "personal pronoun": {
              let singular: null | string;
              let plural: null | string;
              switch (place) {
                case "subject":
                  singular = definition.singular?.subject ?? null;
                  plural = definition.plural?.subject ?? null;
                  break;
                case "object":
                  singular = definition.singular?.object ?? null;
                  plural = definition.plural?.object ?? null;
                  break;
              }
              return new Output([{
                type: "noun",
                determiner: [],
                adjective: [],
                singular,
                plural,
                postAdjective: null,
              } as WordUnitTranslation]);
            }
            case "adjective":
              return adjective(definition, wordUnit.emphasis, count)
                .map((adjective) =>
                  ({ type: "adjective", adjective }) as WordUnitTranslation
                );
            case "compound adjective":
              if (wordUnit.type === "default") {
                return compoundAdjective(definition, wordUnit.emphasis)
                  .map((adjective) =>
                    ({ type: "adjective", adjective }) as WordUnitTranslation
                  );
              } else {
                return new Output();
              }
            default:
              return new Output();
          }
        });
    }
  }
}
type PhraseTranslation =
  | { type: "noun"; noun: English.NounPhrase }
  | {
    type: "adjective";
    adjective: English.AdjectivePhrase;
    inWayPhrase: null | English.NounPhrase;
  };
function defaultPhrase(
  phrase: TokiPona.Phrase & { type: "default" },
  place: "subject" | "object",
): Output<PhraseTranslation> {
  return Output.combine(
    wordUnit(phrase.headWord, place),
    multipleModifiers(phrase.modifiers),
  )
    .flatMap(([headWord, modifier]) => {
      if (headWord.type === "noun" && modifier.type === "adjectival") {
        let count: number;
        switch (phrase.headWord.type) {
          case "number":
          case "default":
            count = 1;
            break;
          case "x ala x":
            return new Output();
          case "reduplication":
            count = phrase.headWord.count;
            break;
        }
        const determiner = fixDeterminer([
          ...headWord.determiner,
          ...modifier.determiner,
        ]);
        if (determiner == null) {
          return new Output();
        }
        const number = findNumber(determiner);
        if (number == null) {
          return new Output();
        }
        const adjective = fixAdjective([
          ...modifier.adjective.reverse(),
          ...headWord.adjective,
        ]);
        let postAdjective: null | {
          adjective: string;
          name: string;
        };
        if (headWord.postAdjective != null && modifier.name != null) {
          return new Output();
        } else if (headWord.postAdjective != null) {
          postAdjective = headWord.postAdjective;
        } else if (modifier.name != null) {
          postAdjective = { adjective: "named", name: modifier.name };
        } else {
          postAdjective = null;
        }
        const preposition = [
          ...nullableAsArray(modifier.inPositionPhrase)
            .map((object) => ({
              preposition: { word: "in", emphasis: false },
              object,
            })),
          ...nullableAsArray(modifier.ofPhrase)
            .map((object) => ({
              preposition: { word: "of", emphasis: false },
              object,
            })),
        ];
        if (
          preposition.length > 1 ||
          (preposition.length > 0 && postAdjective != null)
        ) {
          return new Output();
        }
        const headNoun = nounForms(headWord.singular, headWord.plural, number)
          .map((noun) => ({
            type: "simple" as const,
            determiner,
            adjective,
            noun: {
              word: repeatWithSpace(noun.noun, count),
              emphasis: phrase.headWord.emphasis != null,
            },
            number,
            postCompound: null,
            postAdjective,
            preposition,
            emphasis: phrase.emphasis != null &&
              modifier.nounPreposition == null,
          }));
        let noun: Output<English.NounPhrase>;
        if (modifier.nounPreposition == null) {
          noun = headNoun;
        } else if (
          modifier.ofPhrase != null && modifier.inPositionPhrase != null
        ) {
          noun = headNoun.map((noun) => ({
            ...modifier.nounPreposition!.noun as English.NounPhrase & {
              type: "simple";
            },
            preposition: [{
              preposition: {
                word: modifier.nounPreposition!.preposition,
                emphasis: false,
              },
              object: noun,
            }],
            emphasis: phrase.emphasis != null,
          }));
        } else {
          noun = new Output();
        }
        return noun
          .map((noun) => ({ type: "noun", noun }) as PhraseTranslation);
      } else if (
        headWord.type === "adjective" && modifier.type === "adverbial"
      ) {
        const adjective = headWord.adjective;
        if (adjective.type === "simple") {
          return new Output([{
            type: "adjective",
            adjective: {
              ...adjective,
              adverb: [...modifier.adverb.reverse(), ...adjective.adverb],
              emphasis: phrase.emphasis != null,
            },
            inWayPhrase: modifier.inWayPhrase,
          } as PhraseTranslation]);
        } else if (
          adjective.type === "compound" && modifier.adverb.length === 0
        ) {
          return new Output([{
            type: "adjective",
            adjective,
            inWayPhrase: modifier.inWayPhrase,
          } as PhraseTranslation]);
        } else {
          return new Output();
        }
      } else {
        return new Output();
      }
    });
}
function phrase(
  phrase: TokiPona.Phrase,
  place: "subject" | "object",
): Output<PhraseTranslation> {
  switch (phrase.type) {
    case "default":
      return defaultPhrase(phrase, place);
    case "preverb":
    case "preposition":
      return new Output();
    case "quotation":
      return new Output(new TodoError(`translation of ${phrase.type}`));
  }
}
function multiplePhrases(
  phrases: TokiPona.MultiplePhrases,
  place: "subject" | "object",
): Output<PhraseTranslation> {
  switch (phrases.type) {
    case "single":
      return phrase(phrases.phrase, place);
    case "and conjunction":
    case "anu": {
      const conjunction = CONJUNCTION[phrases.type];
      return Output
        .combine(
          ...phrases.phrases.map((phrases) => multiplePhrases(phrases, place)),
        )
        .filterMap((phrase) => {
          if (phrase.every((phrase) => phrase.type === "noun")) {
            const nouns = phrase
              .map((noun) => noun.noun)
              .flatMap((noun) => {
                if (
                  noun.type === "compound" &&
                  noun.conjunction === conjunction
                ) {
                  return noun.nouns;
                } else {
                  return [noun];
                }
              });
            let number: English.Quantity;
            switch (conjunction) {
              case "and":
                number = "plural";
                break;
              case "or":
                number = nouns[nouns.length - 1].number;
                break;
            }
            return {
              type: "noun",
              noun: {
                type: "compound",
                conjunction,
                nouns,
                preposition: [],
                number,
              },
            } as PhraseTranslation;
          } else if (
            phrases.type === "anu" &&
            phrase.every((phrase) =>
              phrase.type === "adjective" && phrase.inWayPhrase == null
            )
          ) {
            return {
              type: "adjective",
              adjective: {
                type: "compound",
                conjunction,
                adjective: phrase
                  .map((adjective) =>
                    (adjective as PhraseTranslation & { type: "adjective" })
                      .adjective
                  )
                  .flatMap((adjective) => {
                    if (
                      adjective.type === "compound" &&
                      adjective.conjunction === conjunction
                    ) {
                      return adjective.adjective;
                    } else {
                      return [adjective];
                    }
                  }),
              },
            } as PhraseTranslation;
          } else {
            return null;
          }
        });
    }
  }
}
function clause(clause: TokiPona.Clause): Output<English.Clause> {
  switch (clause.type) {
    case "phrases":
      return multiplePhrases(clause.phrases, "object").map((phrase) => {
        switch (phrase.type) {
          case "noun":
            return {
              type: "subject phrase",
              subject: phrase.noun,
            } as English.Clause;
          case "adjective":
            return {
              type: "implied it's",
              verb: {
                type: "linking adjective",
                linkingVerb: {
                  word: "is",
                  emphasis: false,
                },
                adjective: phrase.adjective,
                preposition: nullableAsArray(phrase.inWayPhrase)
                  .map((object) => ({
                    preposition: { word: "in", emphasis: false },
                    object,
                  })),
              },
              preposition: [],
            } as English.Clause;
        }
      });
    case "o vocative":
      return multiplePhrases(clause.phrases, "object").filterMap((phrase) => {
        if (phrase.type === "noun") {
          return { type: "vocative", call: "hey", addressee: phrase.noun };
        } else {
          return null;
        }
      });
    case "prepositions":
    case "li clause":
    case "o clause":
    case "quotation":
      return new Output(new TodoError(`translation of ${clause.type}`));
  }
}
function filler(filler: TokiPona.Emphasis): Array<string> {
  switch (filler.type) {
    case "word":
      return DICTIONARY[filler.word]
        .filter((definition) => definition.type === "filler")
        .map((definition) =>
          `${definition.before}${definition.repeat}${definition.after}`
        );
    case "long word":
      return DICTIONARY[filler.word]
        .filter((definition) => definition.type === "filler")
        .map((definition) =>
          `${definition.before}${
            repeat(definition.repeat, filler.length)
          }${definition.after}`
        );
    case "multiple a":
      return [repeat("ha", filler.count)];
  }
}
function emphasisAsPunctuation(
  emphasis: undefined | null | TokiPona.Emphasis,
  interrogative: boolean,
): null | string {
  let questionMark: string;
  if (interrogative) {
    questionMark = "?";
  } else {
    questionMark = "";
  }
  let exclamationMark: string;
  if (emphasis == null) {
    return null;
  } else {
    switch (emphasis.type) {
      case "word":
        switch (emphasis.word as "a" | "n") {
          case "a":
            exclamationMark = "!";
            break;
          case "n":
            return null;
        }
        break;
      case "long word":
        switch (emphasis.word as "a" | "n") {
          case "a":
            exclamationMark = repeat("!", emphasis.length);
            break;
          case "n":
            return null;
        }
        break;
      case "multiple a":
        return null;
    }
  }
  return `${questionMark}${exclamationMark}`;
}
function interjection(clause: TokiPona.Clause): Output<English.Clause> {
  let interjection: Output<English.Clause> = new Output();
  if (clause.type === "phrases" && clause.phrases.type === "single") {
    const phrase = clause.phrases.phrase;
    if (phrase.type === "default" && phrase.modifiers.length === 0) {
      const headWord = phrase.headWord;
      if (headWord.type === "default" || headWord.type === "reduplication") {
        interjection = new Output(DICTIONARY[headWord.word])
          .filterMap((definition) => {
            if (definition.type === "interjection") {
              switch (headWord.type) {
                case "default":
                  return definition.interjection;
                case "reduplication":
                  return new Array(headWord.count)
                    .fill(definition.interjection)
                    .join(" ");
              }
            } else {
              return null;
            }
          })
          .map((interjection) =>
            ({
              type: "interjection",
              interjection: {
                word: interjection,
                emphasis: headWord.emphasis != null,
              },
            }) as English.Clause
          );
      }
    }
  }
  return interjection;
}
function anuSeme(seme: TokiPona.HeadedWordUnit): English.Clause {
  let interjection: string;
  switch (seme.type) {
    case "default":
      interjection = "right";
      break;
    case "reduplication":
      interjection = new Array(seme.count).fill("right").join(" ");
  }
  return {
    type: "interjection",
    interjection: {
      word: interjection!,
      emphasis: seme.emphasis != null,
    },
  };
}
function sentence(
  sentence: TokiPona.Sentence,
): Output<English.Sentence> {
  // This relies on sentence filter, if some of those filters were disabled,
  // this function might break.
  if (sentence.interrogative === "x ala x") {
    throw new TodoError('translation of "x ala x"');
  }
  if (sentence.finalClause.type === "filler") {
    return new Output(filler(sentence.finalClause.emphasis))
      .map((interjection) =>
        ({
          clauses: [{
            type: "interjection",
            interjection: {
              word: interjection,
              emphasis: false,
            },
          }],
          punctuation: sentence.punctuation,
        }) as English.Sentence
      );
  } else {
    const startingParticle = ((sentence.laClauses[0] ?? sentence.finalClause) as
      & TokiPona.FullClause
      & { type: "default" })
      .startingParticle;
    let startingFiller: Output<null | English.Clause>;
    if (startingParticle == null) {
      startingFiller = new Output([null]);
    } else {
      startingFiller = new Output(filler(startingParticle))
        .map((interjection) => ({
          type: "interjection",
          interjection: {
            word: interjection,
            emphasis: false,
          },
        }));
    }
    const laClauses =
      (sentence.laClauses as Array<TokiPona.FullClause & { type: "default" }>)
        .map(({ clause }) => clause);
    const givenClauses = Output
      .combine(...laClauses.map(clause))
      .map((clauses) =>
        clauses.map((clause) =>
          ({
            type: "dependent",
            conjunction: {
              word: "given",
              emphasis: false,
            },
            clause,
          }) as English.Clause
        )
      );
    const {
      kinOrTaso,
      clause: lastTpClause,
      anuSeme: tpAnuSeme,
      endingParticle,
    } = sentence.finalClause;
    if (kinOrTaso != null) {
      return new Output(
        new TodoError(`translation of "${kinOrTaso.word}" preclause`),
      );
    }
    const lastEngClause = clause(lastTpClause);
    let right: Array<English.Clause>;
    if (tpAnuSeme == null) {
      right = [];
    } else {
      right = [anuSeme(tpAnuSeme)];
    }
    let interjectionClause: Output<English.Clause>;
    if (
      sentence.laClauses.length === 0 && kinOrTaso == null && tpAnuSeme == null
    ) {
      interjectionClause = interjection(lastTpClause);
    } else {
      interjectionClause = new Output();
    }
    const engClauses = Output.combine(
      startingFiller,
      givenClauses,
      Output.concat(lastEngClause, interjectionClause),
    )
      .map(([filler, givenClauses, lastClause]) => [
        ...nullableAsArray(filler),
        ...givenClauses,
        lastClause,
        ...right,
      ]);
    let endingFiller: Output<null | English.Clause>;
    if (endingParticle == null) {
      endingFiller = new Output([null]);
    } else {
      endingFiller = new Output(filler(endingParticle))
        .map((interjection) => ({
          type: "interjection",
          interjection: {
            word: interjection,
            emphasis: false,
          },
        }));
    }
    let punctuation: string;
    if (sentence.interrogative) {
      punctuation = "?";
    } else {
      punctuation = sentence.punctuation;
    }
    return Output.concat(
      Output.combine(
        engClauses,
        new Output(
          nullableAsArray(
            emphasisAsPunctuation(
              endingParticle,
              sentence.interrogative != null,
            ),
          ),
        ),
      )
        .map(([clauses, punctuation]) => ({ clauses, punctuation })),
      Output.combine(engClauses, endingFiller)
        .map(([clauses, filler]) => ({
          clauses: [...clauses, ...nullableAsArray(filler)],
          punctuation,
        })),
    );
  }
}
function nounAsPlainString(definition: Dictionary.Noun): Output<string> {
  return simpleNounForms(definition.singular, definition.plural)
    .map((noun) =>
      [
        ...definition.determiner.map((determiner) => determiner.determiner),
        ...definition.adjective.map((adjective) => adjective.adjective),
        noun,
        ...nullableAsArray(definition.postAdjective)
          .map((adjective) => `${adjective.adjective} ${adjective.name}`),
      ].join(" ")
    );
}
function verbAsPlainString(
  verb: { presentPlural: string; past: string },
): Output<string> {
  switch (settings.get("tense-settings")) {
    case "both":
      return new Output([
        verb.past,
        verb.presentPlural,
        `will ${verb.presentPlural}`,
      ]);
    case "condensed":
      return new Output([
        `(will) ${condenseVerb(verb.presentPlural, verb.past)}`,
      ]);
    case "default only":
      return new Output([verb.presentPlural]);
  }
}
function definitionAsPlainString(
  definition: Dictionary.Definition,
): Output<string> {
  switch (definition.type) {
    case "noun":
      return nounAsPlainString(definition);
    case "personal pronoun":
      return new Output([
        ...nullableAsArray(definition.singular?.subject),
        ...nullableAsArray(definition.singular?.object),
        ...nullableAsArray(definition.plural?.subject),
        ...nullableAsArray(definition.plural?.object),
      ]);
    case "adjective":
      return new Output([
        `${definition.adverb.join(" ")} ${definition.adjective}`,
      ]);
    case "compound adjective": {
      const { adjective } = definition;
      if (adjective.length === 2) {
        return new Output([
          adjective
            .map((adjective) => adjective.adjective)
            .join(" and "),
        ]);
      } else {
        const lastIndex = adjective.length - 1;
        const init = adjective.slice(0, lastIndex);
        const last = adjective[lastIndex];
        return new Output([
          `${
            init.map((adjective) => adjective.adjective).join(", ")
          }, and ${last.adjective}`,
        ]);
      }
    }
    case "determiner":
      return simpleNounForms(definition.determiner, definition.plural);
    case "adverb":
      return new Output([definition.adverb]);
    case "interjection":
      return new Output([definition.interjection]);
    case "verb": {
      const verbs = verbAsPlainString(definition);
      const directObject = Output.combine(
        ...nullableAsArray(definition.directObject)
          .map(nounAsPlainString),
      );
      const indirectObject = Output.combine(
        ...definition.indirectObject
          .map((object) =>
            nounAsPlainString(object.object)
              .map((noun) => `${object.preposition} ${noun}`)
          ),
      );
      return Output.combine(verbs, directObject, indirectObject)
        .map(([verb, directObject, indirectObject]) =>
          [
            verb,
            ...directObject,
            ...indirectObject,
          ].join(" ")
        );
    }
    case "filler":
      return new Output([
        `${definition.before}${definition.repeat}${definition.after}`,
      ]);
    case "particle definition":
      return new Output([definition.definition]);
    case "noun preposition":
      return nounAsPlainString(definition.noun)
        .map((noun) => `${noun} ${definition.preposition}`);
    case "numeral":
      return new Output([`${definition.numeral}`]);
    case "preposition":
      return new Output([definition.preposition]);
    case "preverb as linking verb":
      return new Output([definition.linkingVerb]);
    case "preverb as finite verb":
      return verbAsPlainString(definition);
    case "preverb as modal verb":
      return new Output([definition.verb]);
  }
}
function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): Output<Array<English.Sentence>> {
  switch (sentences.type) {
    case "single word": {
      const { word } = sentences;
      return new Output(DICTIONARY[word])
        .flatMap(definitionAsPlainString)
        .map((definition) =>
          ({
            clauses: [{ type: "free form", text: definition }],
            punctuation: "",
          }) as English.Sentence
        )
        .map((definition) => [definition]);
    }
    case "sentences":
      return Output.combine(...sentences.sentences.map(sentence));
  }
}
export function translate(src: string): Output<Array<English.Sentence>> {
  return parse(src).flatMap(multipleSentences);
}
