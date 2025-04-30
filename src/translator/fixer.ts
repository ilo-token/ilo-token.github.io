import * as Dictionary from "../../dictionary/type.ts";
import { mapNullable } from "../../misc/misc.ts";
import * as English from "./ast.ts";
import { encodeDeterminer } from "./determiner.ts";
import { FilteredError } from "./error.ts";

function fixNounPhrase(noun: English.NounPhrase): English.NounPhrase {
  switch (noun.type) {
    case "simple":
      return {
        ...noun,
        determiner: fixMultipleDeterminers(noun.determiner),
        adjective: fixMultipleAdjectives(noun.adjective),
        postCompound: mapNullable(noun.postCompound, fixNounPhrase),
        preposition: noun.preposition.map(fixPreposition),
      };
    case "compound":
      return { ...noun, nouns: noun.nouns.map(fixNounPhrase) };
  }
}
function filterKind(
  determiners: ReadonlyArray<English.Determiner>,
  kinds: ReadonlyArray<Dictionary.DeterminerType>,
) {
  return determiners.filter(({ kind }) => kinds.includes(kind));
}
function fixMultipleDeterminers(determiner: ReadonlyArray<English.Determiner>) {
  const negative = filterKind(determiner, ["negative"]);
  const first = filterKind(determiner, [
    "article",
    "demonstrative",
    "possessive",
  ]);
  const article = filterKind(determiner, ["article"]);
  const demonstrative = filterKind(determiner, ["demonstrative"]);
  const possessive = filterKind(determiner, ["possessive"]);
  const distributive = filterKind(determiner, ["distributive"]);
  const interrogative = filterKind(determiner, ["interrogative"]);
  const quantitative = filterKind(determiner, ["numeral", "quantifier"]);
  const errors = filterSet([
    [
      negative.length > 1,
      encodeDeterminer`multiple negative determiners ${negative}`,
    ],
    [article.length > 1, encodeDeterminer`multiple articles ${article}`],
    [
      demonstrative.length > 1,
      encodeDeterminer`multiple demonstrative determiners ${demonstrative}`,
    ],
    [
      possessive.length > 1,
      encodeDeterminer`multiple possessive determiners ${possessive}`,
    ],
    [
      distributive.length > 1,
      encodeDeterminer`multiple distributive determiners ${distributive}`,
    ],
    [
      interrogative.length > 1,
      encodeDeterminer`multiple interrogative determiners ${interrogative}`,
    ],
    [
      quantitative.length > 1,
      encodeDeterminer`multiple quantitative determiners ${quantitative}`,
    ],
    [
      article.length > 0 && demonstrative.length > 0,
      encodeDeterminer`article ${article} with demonstrative determiner ${demonstrative}`,
    ],
    [
      article.length > 0 && possessive.length > 0,
      encodeDeterminer`article ${article} with possessive determiner ${possessive}`,
    ],
    [
      demonstrative.length > 0 && possessive.length > 0,
      encodeDeterminer`demonstrative determiner ${demonstrative} with possessive determiner ${possessive}`,
    ],
    [
      negative.length > 0 && interrogative.length > 0,
      encodeDeterminer`negative determiner ${negative} with interrogative determiner ${interrogative}`,
    ],
  ]);
  if (errors.length === 0) {
    return [
      ...negative,
      ...first,
      ...distributive,
      ...interrogative,
      ...quantitative,
    ];
  } else {
    throw new AggregateError(
      errors.map((element) => new FilteredError(element())),
    );
  }
}
function fixAdjectivePhrase(
  adjective: English.AdjectivePhrase,
): English.AdjectivePhrase {
  switch (adjective.type) {
    case "simple":
      return { ...adjective, adverb: fixMultipleAdverbs(adjective.adverb) };
    case "compound":
      return {
        ...adjective,
        adjective: adjective.adjective.map(fixAdjectivePhrase),
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
function flattenAdjectives(
  adjective: English.AdjectivePhrase,
): ReadonlyArray<English.AdjectivePhrase & { type: "simple" }> {
  switch (adjective.type) {
    case "simple":
      return [adjective];
    case "compound":
      if (adjective.conjunction === "and") {
        return adjective.adjective.flatMap(flattenAdjectives);
      } else {
        // This should be unreachable
        throw new FilteredError(
          `${adjective.conjunction} within a string of adjective`,
        );
      }
  }
}
function fixMultipleAdjectives(
  adjective: ReadonlyArray<English.AdjectivePhrase>,
) {
  return adjective
    .map(fixAdjectivePhrase)
    .flatMap(flattenAdjectives)
    .sort((a, b) => rankAdjective(a.kind) - rankAdjective(b.kind));
}
function fixMultipleAdverbs(adverb: ReadonlyArray<English.Adverb>) {
  if (adverb.length > 1) {
    throw new FilteredError("multiple adverbs");
  } else {
    return adverb;
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
function fixAdverbVerb(adverbVerb: English.AdverbVerb): English.AdverbVerb {
  return { ...adverbVerb, preAdverb: fixMultipleAdverbs(adverbVerb.preAdverb) };
}
function fixVerb(verb: English.Verb): English.Verb {
  return {
    modal: mapNullable(verb.modal, fixAdverbVerb),
    verb: verb.verb.map(fixAdverbVerb),
  };
}
function fixVerbPhrase(verb: English.VerbPhrase): English.VerbPhrase {
  switch (verb.type) {
    case "default":
      return {
        ...verb,
        verb: fixVerb(verb.verb),
        subjectComplement: mapNullable(verb.subjectComplement, fixComplement),
        contentClause: mapNullable(verb.contentClause, fixClause),
        object: mapNullable(verb.object, fixNounPhrase),
        objectComplement: mapNullable(verb.objectComplement, fixComplement),
        preposition: verb.preposition.map(fixPreposition),
      };
    case "compound":
      return {
        ...verb,
        verbs: verb.verbs.map(fixVerbPhrase),
        object: mapNullable(verb.object, fixNounPhrase),
        objectComplement: mapNullable(verb.objectComplement, fixComplement),
        preposition: verb.preposition.map(fixPreposition),
      };
  }
}
function fixPreposition(
  preposition: English.Preposition,
): English.Preposition {
  return {
    ...preposition,
    adverb: fixMultipleAdverbs(preposition.adverb),
    object: fixNounPhrase(preposition.object),
  };
}
function fixClause(clause: English.Clause): English.Clause {
  switch (clause.type) {
    case "default":
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
function fixSentence({ clauses, punctuation }: English.Sentence) {
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
function filterSet<const T>(
  set: ReadonlyArray<readonly [condition: boolean, value: T]>,
) {
  return set.filter(([condition]) => condition).map(([_, value]) => value);
}
