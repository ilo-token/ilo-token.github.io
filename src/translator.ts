import { Definition, Noun } from "dictionary/type.ts";
import { parse } from "./ast-parser.ts";
import * as TokiPona from "./ast.ts";
import * as English from "./english-ast.ts";
import { TodoError } from "./error.ts";
import { nullableAsArray, repeat } from "./misc.ts";
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
function singularPluralForms(
  singular: undefined | null | string,
  plural: undefined | null | string,
): Array<string> {
  switch (settings.get("number-settings")) {
    case "both":
      return [
        ...nullableAsArray(singular),
        ...nullableAsArray(plural),
      ];
    case "condensed":
      if (singular != null && plural != null) {
        return [condense(singular, plural)];
      } else if (singular != null) {
        return [singular];
      } else {
        return [plural!];
      }
    case "default only":
      return [singular ?? plural!];
  }
}
function determiner(
  definition: Dictionary.Determiner,
  emphasis = false,
  count = 1,
): Array<English.Determiner> {
  return singularPluralForms(definition.determiner, definition.plural)
    .map((determiner) => ({
      kind: definition.kind,
      determiner: {
        word: repeat(determiner, count),
        emphasis,
      },
      number: definition.number,
    }));
}
function adjective(
  definition: Dictionary.Adjective,
  emphasis: null | TokiPona.Emphasis,
  count = 1,
): Array<English.AdjectivePhrase> {
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
  return [
    ...nullableAsArray(so!).map((so) => ({ emphasis: false, so })),
    { emphasis: emphasis != null, so: null },
  ]
    .map(({ emphasis, so }) => ({
      type: "simple",
      kind: definition.kind,
      adverb: [...definition.adverb, ...nullableAsArray(so)].map(unemphasized),
      adjective: {
        word: repeat(definition.adjective, count),
        emphasis,
      },
    }));
}
type ModifierTranslation =
  | { type: "noun"; noun: English.NounPhrase }
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
          // The noun node needs these to have numbers, but modifier numbers
          // will never be read so its fine to assign it as any value, and we
          // used "both"
          case "noun": {
            const engDeterminer = Output.combine(
              ...definition.determiner
                .map((definition) => new Output(determiner(definition))),
            );
            const engAdjective = Output.combine(
              ...definition.adjective
                .map((definition) => new Output(adjective(definition, null))),
            );
            const noun = new Output(
              singularPluralForms(definition.singular, definition.plural),
            );
            return Output.combine(noun, engDeterminer, engAdjective)
              .map(([noun, determiner, adjective]) =>
                ({
                  type: "noun",
                  noun: {
                    type: "simple",
                    determiner,
                    adjective,
                    noun: { word: noun, emphasis },
                    number: "both",
                    postCompound: null,
                    postAdjective: definition.postAdjective,
                    preposition: [],
                  },
                }) as ModifierTranslation
              );
          }
          case "personal pronoun":
            return new Output(
              singularPluralForms(
                definition.singular?.object,
                definition.plural?.object,
              ),
            )
              .map((pronoun) =>
                ({
                  type: "noun",
                  noun: {
                    type: "simple",
                    determiner: [],
                    adjective: [],
                    noun: { word: pronoun, emphasis },
                    number: "both",
                    postCompound: null,
                    postAdjective: null,
                    preposition: [],
                  },
                }) as ModifierTranslation
              );
          case "determiner":
            return new Output(
              determiner(definition, word.emphasis != null, count),
            )
              .map((determiner) =>
                ({
                  type: "determiner",
                  determiner,
                }) as ModifierTranslation
              );
          case "adjective":
            return new Output(adjective(definition, word.emphasis, count))
              .map((adjective) =>
                ({
                  type: "adjective",
                  adjective,
                }) as ModifierTranslation
              );
          case "compound adjective":
            if (word.type === "default") {
              return Output.combine(
                ...definition.adjective
                  .map((definition) =>
                    new Output(adjective(definition, word.emphasis))
                  ),
              )
                .map((adjective) =>
                  ({
                    type: "adjective",
                    adjective: {
                      type: "compound",
                      conjunction: "and",
                      adjective,
                    },
                  }) as ModifierTranslation
                );
            } else {
              return new Output();
            }
          case "adverb":
            return new Output([{
              type: "adverb",
              adverb: { word: definition.adverb, emphasis },
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
      return phrase(modifier.phrase);
    case "nanpa":
      return phrase(modifier.phrase).filterMap((phrase) => {
        if (phrase.type === "noun") {
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
export function rankAdjective(kind: Dictionary.AdjectiveType): number {
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
    .slice()
    .reverse()
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
type MutlitpleModifierTranslation =
  | {
    type: "adjectival";
    determiner: Array<English.Determiner>;
    adjective: Array<English.AdjectivePhrase>;
    name: string;
    inPositionPhrase: null | English.NounPhrase;
    ofPhrase: null | English.NounPhrase;
  }
  | {
    type: "adverbial";
    adverb: Array<English.Word>;
    inWayPhrase: null | English.NounPhrase;
  };
function multipleModifiers(
  modifiers: Array<TokiPona.Modifier>,
): Output<null | MutlitpleModifierTranslation> {
  if (modifiers.length === 0) {
    return new Output([null]);
  } else {
    return Output
      .combine(...modifiers.map(modifier))
      .flatMap((modifiers) => {
        const noun = modifiers
          .filter((modifier) => modifier.type === "noun")
          .map((modifier) => modifier.noun);
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
        throw new Error("todo");
      });
  }
}
type PhraseTranslation =
  | { type: "noun"; noun: English.NounPhrase }
  | { type: "adjective"; adjective: English.AdjectivePhrase };
function phrase(phrase: TokiPona.Phrase): Output<PhraseTranslation> {
  switch (phrase.type) {
    case "default":
      return new Output(new TodoError(`translation of ${phrase.type}`));
    case "preverb":
    case "preposition":
      return new Output();
    case "quotation":
      return new Output(new TodoError(`translation of ${phrase.type}`));
  }
}
function multiplePhrases(
  phrases: TokiPona.MultiplePhrases,
): Output<PhraseTranslation> {
  switch (phrases.type) {
    case "single":
      return phrase(phrases.phrase);
    case "and conjunction":
    case "anu": {
      const conjunction = CONJUNCTION[phrases.type];
      return Output
        .combine(...phrases.phrases.map(multiplePhrases))
        .filterMap((phrases) => {
          if (phrases.every((phrase) => phrase.type === "noun")) {
            const nouns = phrases
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
          } else if (phrases.every((phrase) => phrase.type === "adjective")) {
            return {
              type: "adjective",
              adjective: {
                type: "compound",
                adjective: phrases
                  .map((adjective) => adjective.adjective)
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
      return multiplePhrases(clause.phrases).map((phrase) => {
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
                preposition: [],
              },
              preposition: [],
            } as English.Clause;
        }
      });
    case "o vocative":
      return multiplePhrases(clause.phrases).filterMap((phrase) => {
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
function nounAsPlainString(definition: Noun): Array<string> {
  return singularPluralForms(definition.singular, definition.plural)
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
): Array<string> {
  switch (settings.get("tense-settings")) {
    case "both":
      return [
        verb.past,
        verb.presentPlural,
        `will ${verb.presentPlural}`,
      ];
    case "condensed":
      return [
        `(will) ${condenseVerb(verb.presentPlural, verb.past)}`,
      ];
    case "default only":
      return [verb.presentPlural];
  }
}
function definitionAsPlainString(definition: Definition): Array<string> {
  switch (definition.type) {
    case "noun":
      return nounAsPlainString(definition);
    case "personal pronoun":
      return [
        ...nullableAsArray(definition.singular?.subject),
        ...nullableAsArray(definition.singular?.object),
        ...nullableAsArray(definition.plural?.subject),
        ...nullableAsArray(definition.plural?.object),
      ];
    case "adjective":
      return [
        `${definition.adverb.join(" ")} ${definition.adjective}`,
      ];
    case "compound adjective": {
      const { adjective } = definition;
      if (adjective.length === 2) {
        return [
          adjective
            .map((adjective) => adjective.adjective)
            .join(" and "),
        ];
      } else {
        const lastIndex = adjective.length - 1;
        const init = adjective.slice(0, lastIndex);
        const last = adjective[lastIndex];
        return [
          `${
            init.map((adjective) => adjective.adjective).join(", ")
          }, and ${last.adjective}`,
        ];
      }
    }
    case "determiner":
      return singularPluralForms(definition.determiner, definition.plural);
    case "adverb":
      return [definition.adverb];
    case "interjection":
      return [definition.interjection];
    case "verb": {
      const verbs = verbAsPlainString(definition);
      const directObjects = nullableAsArray(definition.directObject)
        .flatMap(nounAsPlainString);
      const indirectObjects = definition.indirectObject
        .flatMap((object) =>
          nounAsPlainString(object.object)
            .map((noun) => `${object.preposition} ${noun}`)
        );
      return verbs
        .map((verb) => [verb, ...directObjects, ...indirectObjects].join(" "));
    }
    case "filler":
      return [`${definition.before}${definition.repeat}${definition.after}`];
    case "particle definition":
      return [definition.definition];
    case "noun preposition":
      return nounAsPlainString(definition.noun)
        .map((noun) => `${noun} ${definition.preposition}`);
    case "numeral":
      return [`${definition.numeral}`];
    case "preposition":
      return [definition.preposition];
    case "preverb as linking verb":
      return [definition.linkingVerb];
    case "preverb as finite verb":
      return verbAsPlainString(definition);
    case "preverb as modal verb":
      return [definition.verb];
  }
}
function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): Output<Array<English.Sentence>> {
  switch (sentences.type) {
    case "single word": {
      const { word } = sentences;
      return new Output(DICTIONARY[word])
        .flatMap((definition) =>
          new Output(definitionAsPlainString(definition))
        )
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
