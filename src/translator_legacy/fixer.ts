import * as Dictionary from "../dictionary/type.ts";
import { mapNullable } from "../misc/misc.ts";
import { FilteredError } from "../translator/error.ts";
import * as English from "./ast.ts";
import { encodeDeterminer } from "./determiner.ts";

function fixNounPhrase(noun: English.NounPhrase): English.NounPhrase {
  switch (noun.type) {
    case "simple":
      if (noun.adjectiveName != null && noun.prepositions.length > 0) {
        throw new FilteredError("named noun with preposition");
      }
      if (
        noun.postCompound != null && noun.postCompound.type === "simple" &&
        noun.postCompound.prepositions.length > 0
      ) {
        new FilteredError(`preposition within "${noun.noun.word} X" phrase`);
      }
      return {
        ...noun,
        determiners: fixMultipleDeterminers(noun.determiners),
        adjectives: fixMultipleAdjectives(noun.adjectives),
        postCompound: mapNullable(noun.postCompound, fixNounPhrase),
        prepositions: fixMultiplePrepositions(noun.prepositions),
      };
    case "compound":
      return {
        ...noun,
        nouns: noun.nouns.map(fixNounPhrase),
      };
  }
}
function filterKind(
  determiners: ReadonlyArray<English.Determiner>,
  kinds: ReadonlyArray<Dictionary.DeterminerType>,
) {
  return determiners.filter(({ kind }) => kinds.includes(kind));
}
function fixMultipleDeterminers(
  determiners: ReadonlyArray<English.Determiner>,
) {
  const negatives = filterKind(determiners, ["negative"]);
  const first = filterKind(determiners, [
    "article",
    "demonstrative",
    "possessive",
  ]);
  const articles = filterKind(determiners, ["article"]);
  const demonstratives = filterKind(determiners, ["demonstrative"]);
  const possessives = filterKind(determiners, ["possessive"]);
  const distributiveDeterminers = filterKind(determiners, ["distributive"]);
  const interrogatives = filterKind(determiners, ["interrogative"]);
  const quantitativeDeterminers = filterKind(determiners, [
    "numeral",
    "quantifier",
  ]);
  const errors = filterSet([
    [
      negatives.length > 1,
      encodeDeterminer`multiple negative determiners ${negatives}`,
    ],
    [articles.length > 1, encodeDeterminer`multiple articles ${articles}`],
    [
      demonstratives.length > 1,
      encodeDeterminer`multiple demonstrative determiners ${demonstratives}`,
    ],
    [
      possessives.length > 1,
      encodeDeterminer`multiple possessive determiners ${possessives}`,
    ],
    [
      distributiveDeterminers.length > 1,
      encodeDeterminer`multiple distributive determiners ${distributiveDeterminers}`,
    ],
    [
      interrogatives.length > 1,
      encodeDeterminer`multiple interrogative determiners ${interrogatives}`,
    ],
    [
      quantitativeDeterminers.length > 1,
      encodeDeterminer`multiple quantitative determiners ${quantitativeDeterminers}`,
    ],
    [
      articles.length > 0 && demonstratives.length > 0,
      encodeDeterminer`article ${articles} with demonstrative determiner ${demonstratives}`,
    ],
    [
      articles.length > 0 && possessives.length > 0,
      encodeDeterminer`article ${articles} with possessive determiner ${possessives}`,
    ],
    [
      demonstratives.length > 0 && possessives.length > 0,
      encodeDeterminer`demonstrative determiner ${demonstratives} with possessive determiner ${possessives}`,
    ],
    [
      negatives.length > 0 && interrogatives.length > 0,
      encodeDeterminer`negative determiner ${negatives} with interrogative determiner ${interrogatives}`,
    ],
  ]);
  if (errors.length === 0) {
    return [
      ...negatives,
      ...first,
      ...distributiveDeterminers,
      ...interrogatives,
      ...quantitativeDeterminers,
    ];
  } else {
    throw new AggregateError(
      errors.map((message) => new FilteredError(message())),
    );
  }
}
function fixAdjectivePhrase(
  adjective: English.AdjectivePhrase,
): English.AdjectivePhrase {
  switch (adjective.type) {
    case "simple":
      return { ...adjective, adverbs: fixMultipleAdverbs(adjective.adverbs) };
    case "compound":
      return {
        ...adjective,
        adjectives: adjective.adjectives.map(fixAdjectivePhrase),
      };
  }
}
function rankAdjective(kind: Dictionary.AdjectiveType) {
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
function flattenAdjective(
  adjective: English.AdjectivePhrase,
): ReadonlyArray<English.AdjectivePhrase & { type: "simple" }> {
  switch (adjective.type) {
    case "simple":
      return [adjective];
    case "compound":
      if (adjective.conjunction === "and") {
        return adjective.adjectives.flatMap(flattenAdjective);
      } else {
        // This should be unreachable
        throw new FilteredError(
          `${adjective.conjunction} within a string of adjective`,
        );
      }
  }
}
function fixMultipleAdjectives(
  adjectives: ReadonlyArray<English.AdjectivePhrase>,
) {
  return adjectives
    .map(fixAdjectivePhrase)
    .flatMap(flattenAdjective)
    .sort((a, b) => rankAdjective(a.kind) - rankAdjective(b.kind));
}
function fixMultipleAdverbs(adverbs: ReadonlyArray<English.Adverb>) {
  if (adverbs.length > 1) {
    throw new FilteredError("multiple adverbs");
  } else {
    return adverbs;
  }
}
function fixComplement(complement: English.Complement): English.Complement {
  switch (complement.type) {
    case "noun":
      return { type: "noun", noun: fixNounPhrase(complement.noun) };
    case "adjective":
      return {
        type: "adjective",
        adjective: fixAdjectivePhrase(complement.adjective),
      };
  }
}
function fixSingleVerb(adverbVerb: English.Verb): English.Verb {
  return {
    ...adverbVerb,
    preAdverbs: fixMultipleAdverbs(adverbVerb.preAdverbs),
  };
}
function fixVerb(verb: English.WholeVerb): English.WholeVerb {
  return {
    modal: mapNullable(verb.modal, fixSingleVerb),
    verbs: verb.verbs.map(fixSingleVerb),
  };
}
function fixVerbPhrase(verb: English.VerbPhrase): English.VerbPhrase {
  switch (verb.type) {
    case "simple":
      return {
        ...verb,
        verb: fixVerb(verb.verb),
        subjectComplement: mapNullable(verb.subjectComplement, fixComplement),
        contentClause: mapNullable(verb.contentClause, fixClause),
        object: mapNullable(verb.object, fixNounPhrase),
        objectComplement: mapNullable(verb.objectComplement, fixComplement),
        prepositions: fixMultiplePrepositions(verb.prepositions),
      };
    case "compound":
      return {
        ...verb,
        verbs: verb.verbs.map(fixVerbPhrase),
        object: mapNullable(verb.object, fixNounPhrase),
        objectComplement: mapNullable(verb.objectComplement, fixComplement),
        prepositions: fixMultiplePrepositions(verb.prepositions),
      };
  }
}
function nounHasPreposition(noun: English.NounPhrase): boolean {
  switch (noun.type) {
    case "simple":
      return noun.prepositions.length > 0 ||
        (noun.postCompound != null && nounHasPreposition(noun.postCompound));
    case "compound":
      return noun.nouns.some(nounHasPreposition);
  }
}
function fixPreposition(
  preposition: English.Preposition,
): English.Preposition {
  if (nounHasPreposition(preposition.object)) {
    throw new FilteredError("nested preposition");
  }
  return {
    ...preposition,
    adverbs: fixMultipleAdverbs(preposition.adverbs),
    object: fixNounPhrase(preposition.object),
  };
}
function fixMultiplePrepositions(
  prepositions: ReadonlyArray<English.Preposition>,
): ReadonlyArray<English.Preposition> {
  if (
    prepositions.filter((preposition) => preposition.preposition.word === "of")
      .length > 1
  ) {
    throw new FilteredError('multiple "of"');
  } else {
    return prepositions.map(fixPreposition);
  }
}
function fixClause(clause: English.Clause): English.Clause {
  switch (clause.type) {
    case "simple":
      return {
        ...clause,
        subject: fixNounPhrase(clause.subject),
        verb: fixVerbPhrase(clause.verb),
      };
    case "subject phrase":
      return { type: "subject phrase", subject: fixNounPhrase(clause.subject) };
    case "preposition":
      return { ...fixPreposition(clause), type: "preposition" };
    case "vocative":
      return { ...clause, addressee: fixNounPhrase(clause.addressee) };
    case "dependent":
      return { ...clause, clause: fixClause(clause.clause) };
    case "adverb":
    case "interjection":
      return clause;
  }
}
function fixSentence(
  { clauses, punctuation }: English.Sentence,
): English.Sentence {
  return { clauses: clauses.map(fixClause), punctuation };
}
export function fixMultipleSentences(
  sentence: English.MultipleSentences,
): English.MultipleSentences {
  switch (sentence.type) {
    case "free form":
      return sentence;
    case "sentences":
      return {
        type: "sentences",
        sentences: sentence.sentences.map(fixSentence),
      };
  }
}
function filterSet<T>(
  set: ReadonlyArray<readonly [condition: boolean, value: T]>,
) {
  return set.filter(([condition]) => condition).map(([_, value]) => value);
}
