import { parse } from "./ast-parser.ts";
import * as TokiPona from "./ast.ts";
import { Definition } from "./dictionary.ts";
import {
  CONTENT_WORD_DEFINITION,
  NUMERAL_DEFINITION,
  PARTICLE_DEFINITION,
  PREPOSITION_DEFINITION,
  SPECIAL_CONTENT_WORD_DEFINITION,
} from "./dictionary.ts";
import * as English from "./english-ast.ts";
import { TodoError } from "./error.ts";
import { nullableAsArray, repeat } from "./misc.ts";
import { Output } from "./output.ts";
import { settings } from "./settings.ts";

const CONJUNCTION = { "and conjunction": "and", "anu": "or" } as const;

type PhraseTranslation =
  | { type: "noun"; noun: English.NounPhrase }
  | { type: "adjective"; adjective: English.AdjectivePhrase };
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
      switch (filler.word as "a" | "n") {
        case "a":
          return ["ah", "oh", "ha", "eh", "um", "oy"];
        case "n":
          return ["hm", "uh", "mm", "er", "umm"];
      }
      // unreachable
      // fallthrough
    case "long word": {
      let output: Array<string>;
      switch (filler.word as "a" | "n") {
        case "a":
          output = ["ah", "oh", "ha", "eh", "um"];
          break;
        case "n":
          output = ["hm", "uh", "mm", "um"];
          break;
      }
      return output
        .map(([first, second]) => `${first}${repeat(second, filler.length)}`);
    }
    case "multiple a":
      return [repeat("ha", filler.count)];
  }
}
function emphasisAsPunctuation(
  emphasis?: undefined | null | TokiPona.Emphasis,
): null | string {
  if (emphasis == null) {
    return null;
  } else {
    switch (emphasis.type) {
      case "word":
        switch (emphasis.word as "a" | "n") {
          case "a":
            return "!";
          case "n":
            return null;
        }
        // unreachable
        // fallthrough
      case "long word":
        switch (emphasis.word as "a" | "n") {
          case "a":
            return repeat("!", emphasis.length);
          case "n":
            return null;
        }
        // unreachable
        // fallthrough
      case "multiple a":
        return null;
    }
  }
}
function interjection(clause: TokiPona.Clause): Output<English.Clause> {
  let interjection: Output<English.Clause> = new Output();
  if (
    clause.type === "phrases" &&
    clause.phrases.type === "single"
  ) {
    const phrase = clause.phrases.phrase;
    if (
      phrase.type === "default" &&
      phrase.modifiers.length === 0 &&
      phrase.headWord.type === "default" &&
      phrase.headWord.emphasis == null
    ) {
      interjection = new Output(CONTENT_WORD_DEFINITION[phrase.headWord.word])
        .filterMap((definition) => {
          if (definition.type === "interjection") {
            return definition.interjection;
          } else {
            return null;
          }
        })
        .map((interjection) =>
          ({ type: "interjection", interjection }) as English.Clause
        );
    }
  }
  return interjection;
}
function sentence(
  sentence: TokiPona.Sentence,
): Output<English.Sentence> {
  // This relies on sentence filter, if some of those filters were disabled,
  // this function might break.
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
    return Output.concat(
      Output.combine(
        engClauses,
        new Output(nullableAsArray(emphasisAsPunctuation(endingParticle))),
      )
        .map(([clauses, punctuation]) => ({ clauses, punctuation })),
      Output.combine(engClauses, endingFiller)
        .map(([clauses, filler]) => ({
          clauses: [...clauses, ...nullableAsArray(filler)],
          punctuation: sentence.punctuation,
        })),
    );
  }
}
function nounAsPlainString(
  definition: Definition & { type: "noun" },
): Array<string> {
  let nouns: Array<string>;
  switch (settings.get("number-settings")) {
    case "both":
      nouns = [
        ...nullableAsArray(definition.singular),
        ...nullableAsArray(definition.plural),
      ];
      break;
    case "condensed":
      nouns = [definition.condensed];
      break;
    case "default only":
      nouns = [definition.singular ?? definition.plural!];
      break;
  }
  return nouns.map((noun) =>
    `${
      definition.adjectives
        .map((adjective) => adjective.adjective)
        .join(" ")
    } ${noun}`
  );
}
function allDefinitionAsPlainString(word: string): Array<string> {
  const definitions = CONTENT_WORD_DEFINITION[word];
  if (definitions == null) {
    return [];
  }
  return definitions.flatMap((definition) => {
    switch (definition.type) {
      case "noun":
        return nounAsPlainString(definition);
      case "personal pronoun":
        return [
          ...nullableAsArray(definition.singularSubject),
          ...nullableAsArray(definition.singularObject),
          ...nullableAsArray(definition.pluralSubject),
          ...nullableAsArray(definition.pluralObject),
        ];
      case "indefinite pronoun":
        return [definition.pronoun];
      case "adjective":
        return [
          `${
            definition.adverbs.map((adverb) => adverb.adverb).join(" ")
          } ${definition.adjective}`,
        ];
      case "compound adjective": {
        const { adjectives } = definition;
        if (adjectives.length === 2) {
          return [
            adjectives
              .map((adjective) => adjective.adjective)
              .join(" and "),
          ];
        } else {
          const lastIndex = adjectives.length - 1;
          const init = adjectives.slice(0, lastIndex);
          const last = adjectives[lastIndex];
          return `${
            init.map((adjective) => adjective.adjective).join(", ")
          }, and ${last.adjective}`;
        }
      }
      case "determiner":
        return [definition.determiner];
      case "adverb":
        return [definition.adverb];
      case "verb": {
        let objects: null | Array<string> = null;
        if (definition.object != null) {
          objects = nounAsPlainString(definition.object);
        }
        let verbs: Array<string>;
        switch (settings.get("tense-settings")) {
          case "both":
            verbs = [
              definition.past,
              definition.present,
              `will ${definition.present}`,
            ];
            break;
          case "condensed":
            verbs = [`(will) ${definition.condensed}`];
            break;
          case "default only":
            verbs = [definition.present];
            break;
        }
        let pastParticiple: null | string = null;
        if (definition.pastParticiple !== definition.past) {
          pastParticiple = definition.pastParticiple;
        }
        if (objects == null) {
          return [
            ...verbs,
            ...nullableAsArray(pastParticiple),
            definition.gerund,
          ];
        } else {
          return [...verbs, definition.gerund]
            .flatMap((verb) => objects.map((object) => `${verb} ${object}`));
        }
      }
      case "interjection":
        return [definition.interjection];
    }
  });
}
function multipleSentences(
  sentences: TokiPona.MultipleSentences,
): Output<Array<English.Sentence>> {
  switch (sentences.type) {
    case "single word": {
      const { word } = sentences;
      return new Output([
        ...PARTICLE_DEFINITION[word] ?? [],
        ...PREPOSITION_DEFINITION[word] ?? [],
        ...nullableAsArray(NUMERAL_DEFINITION[word]).map((num) => `${num}`),
        // TODO: Preverb
        ...SPECIAL_CONTENT_WORD_DEFINITION[word] ?? [],
        ...allDefinitionAsPlainString(word),
      ])
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
