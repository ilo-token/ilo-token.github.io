import * as English from "./ast.ts";
import { AdjectiveWithInWay } from "./adjective.ts";
import { AdjectivalModifier } from "./modifier.ts";
import { FilteredError } from "./error.ts";
import { mapNullable, nullableAsArray } from "../../misc/misc.ts";
import { nounAsPreposition } from "./preposition.ts";
import { AdverbialModifier } from "./modifier.ts";

export type PhraseTranslation =
  | Readonly<{ type: "noun"; noun: English.NounPhrase }>
  | (Readonly<{ type: "adjective" }> & AdjectiveWithInWay)
  | Readonly<{ type: "verb"; verb: English.VerbPhrase }>;

function nounPhrase(
  options: Readonly<{
    emphasis: boolean;
    noun: English.SimpleNounPhrase;
    modifier: AdjectivalModifier;
  }>,
): null | English.SimpleNounPhrase {
  const { emphasis, noun, modifier } = options;
  const determiners = [
    ...modifier.determiners.toReversed(),
    ...noun.determiners,
  ];
  const adjectives = [
    ...modifier.adjectives.toReversed(),
    ...noun.adjectives,
  ];
  if (noun.adjectiveName != null && modifier.name != null) {
    throw new FilteredError("double name");
  }
  const adjectiveName = noun.adjectiveName ??
    mapNullable(
      modifier.name,
      (name): English.AdjectiveName => ({ adjective: "named", name }),
    );
  const prepositions = modifier.ofPhrase
    .map((object) => nounAsPreposition(object, "of"));
  const { nounPreposition } = modifier;
  const headNoun: English.SimpleNounPhrase = {
    ...noun,
    determiners,
    adjectives,
    perspective: noun.perspective,
    postCompound: null,
    adjectiveName,
    prepositions,
    phraseEmphasis: emphasis &&
      nounPreposition == null,
  };
  if (nounPreposition == null) {
    return headNoun;
  } else if (modifier.ofPhrase.length === 0) {
    const { noun: nounOf, preposition } = nounPreposition;
    switch (nounOf.type) {
      case "simple":
        return {
          ...nounOf,
          prepositions: [
            nounAsPreposition({ ...headNoun, type: "simple" }, preposition),
          ],
          phraseEmphasis: emphasis,
        };
      case "compound":
        throw new FilteredError("compound nouns followed by preposition");
    }
  } else {
    return null;
  }
}
function adjectivePhrase(
  options: Readonly<{
    emphasis: boolean;
    adjective: English.AdjectivePhrase;
    modifier: AdverbialModifier;
  }>,
): AdjectiveWithInWay {
  const { emphasis, adjective, modifier } = options;
  switch (adjective.type) {
    case "simple": {
      const adverbs = [
        ...modifier.adverbs.toReversed(),
        ...adjective.adverbs,
      ];
      return {
        adjective: {
          ...adjective,
          adverbs,
          emphasis,
        },
        inWayPhrase: modifier.inWayPhrase,
      };
    }
    case "compound":
      if (modifier.adverbs.length === 0) {
        return {
          adjective: { ...adjective, emphasis: adjective.emphasis || emphasis },
          inWayPhrase: modifier.inWayPhrase,
        };
      } else {
        throw new FilteredError("adverb with compound adjective");
      }
  }
}
function verbPhrase(
  options: Readonly<{
    emphasis: boolean;
    verb: English.SimpleVerbPhrase;
    modifier: AdverbialModifier;
  }>,
): English.SimpleVerbPhrase {
  const { emphasis, verb, modifier } = options;
  const prepositions = [
    ...verb.prepositions,
    ...nullableAsArray(modifier.inWayPhrase)
      .map((object) => nounAsPreposition(object, "in")),
  ];
  const adverbs = modifier.adverbs.toReversed();
  return {
    ...verb,
    verb: [
      {
        preAdverbs: adverbs,
        verb: verb.verb[0].verb,
        postAdverb: null,
      },
      ...verb.verb.slice(1),
    ],
    prepositions,
    emphasis,
  };
}
