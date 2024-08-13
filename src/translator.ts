import { Definition, Noun } from "dictionary/type.ts";
import { parse } from "./ast-parser.ts";
import * as TokiPona from "./ast.ts";
import * as English from "./english-ast.ts";
import { TodoError } from "./error.ts";
import { nullableAsArray, repeat } from "./misc.ts";
import { Output } from "./output.ts";
import { settings } from "./settings.ts";
import { DICTIONARY } from "dictionary/dictionary.ts";

const CONJUNCTION = { "and conjunction": "and", "anu": "or" } as const;

type PhraseTranslation =
  | { type: "noun"; noun: English.NounPhrase }
  | { type: "adjective"; adjective: English.AdjectivePhrase };

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
function phrase(phrase: TokiPona.Phrase): Output<PhraseTranslation> {
  switch (phrase.type) {
    case "default":
    case "preverb":
    case "preposition":
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
            let quantity: English.Quantity;
            switch (conjunction) {
              case "and":
                quantity = "plural";
                break;
              case "or":
                quantity = nouns[nouns.length - 1].quantity;
                break;
            }
            return {
              type: "noun",
              noun: {
                type: "compound",
                conjunction,
                nouns,
                preposition: [],
                quantity,
              },
            } as PhraseTranslation;
          } else if (phrases.every((phrase) => phrase.type === "adjective")) {
            return {
              type: "adjective",
              adjective: {
                type: "compound",
                adjectives: phrases
                  .map((adjective) => adjective.adjective)
                  .flatMap((adjective) => {
                    if (
                      adjective.type === "compound" &&
                      adjective.conjunction === conjunction
                    ) {
                      return adjective.adjectives;
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
                linkingVerb: "is",
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
      if (
        (headWord.type === "default" || headWord.type === "reduplication") &&
        headWord.emphasis == null
      ) {
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
            ({ type: "interjection", interjection }) as English.Clause
          );
      }
    }
  }
  return interjection;
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
            interjection,
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
        .map((interjection) => ({ type: "interjection", interjection }));
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
            conjunction: "given",
            clause,
          }) as English.Clause
        )
      );
    const { kinOrTaso, clause: lastTpClause, anuSeme, endingParticle } =
      sentence.finalClause;
    if (kinOrTaso != null) {
      return new Output(
        new TodoError(`translation of "${kinOrTaso.word}" preclause`),
      );
    }
    if (anuSeme != null) {
      return new Output(new TodoError('translation of "anu seme"'));
    }
    const lastEngClause = clause(lastTpClause);
    let interjectionClause: Output<English.Clause>;
    if (sentence.laClauses.length === 0) {
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
      ]);
    let endingFiller: Output<null | English.Clause>;
    if (endingParticle == null) {
      endingFiller = new Output([null]);
    } else {
      endingFiller = new Output(filler(endingParticle))
        .map((interjection) => ({ type: "interjection", interjection }));
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
function nounOnlyAsPlainString(
  noun: { singular: null | string; plural: null | string },
): Array<string> {
  switch (settings.get("number-settings")) {
    case "both":
      return [
        ...nullableAsArray(noun.singular),
        ...nullableAsArray(noun.plural),
      ];
    case "condensed":
      if (noun.singular != null && noun.plural != null) {
        return [condense(noun.singular, noun.plural)];
      } else if (noun.singular != null) {
        return [noun.singular];
      } else {
        return [noun.plural!];
      }
    case "default only":
      return [noun.singular ?? noun.plural!];
  }
}
function nounAsPlainString(definition: Noun): Array<string> {
  return nounOnlyAsPlainString(definition)
    .map((noun) =>
      [
        ...definition.determiner.map((determiner) => determiner.determiner),
        ...definition.adjective.map((adjective) => adjective.adjective),
        noun,
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
      return nounOnlyAsPlainString({
        singular: definition.determiner,
        plural: definition.plural,
      });
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
            .map((noun) => `${noun} ${object.preposition}`)
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
