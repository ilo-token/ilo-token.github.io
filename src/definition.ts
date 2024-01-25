/** Represents possible translations of words. */
export type Translation = {
  noun: Array<string>;
  adjective: Array<string>;
  adverb: Array<string>;

  // Verb definitions usable as noun or adjective
  gerundVerb: Array<string>;

  // Transitive means there's work applying to the object (or just sensing it)
  pastTransitive: Array<string>;
  presentTransitive: Array<string>;

  // Intransitive means there's nothing done to anything but the subject itself
  pastIntransitive: Array<string>;
  presentIntransitive: Array<string>;

  interjection?: Array<string>;
};
/** Record of word translations. */
export const DEFINITION: { [key: string]: Translation } = {
  // All Linku definitions are gathered from:
  // https://github.com/lipu-linku/sona/blob/main/words/translations/eng/definitions.toml
  // Last commit used: 69ecccb

  // TODO: preverb
  // TODO: preposition

  // akesi
  // Linku: reptile, amphibian
  akesi: {
    noun: ["reptile", "reptiles", "amphibian", "amphibians"],
    adjective: ["reptilian", "amphibian"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // ala
  // Linku: no, not, zero; [~ ala ~] (used to form a yes-no question); nothing
  ala: {
    noun: ["nothing", "no", "zero"],
    adjective: ["not", "no", "zero"],
    adverb: ["not"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // alasa
  // Linku: hunt, search, forage, attempt; (preverb) try to
  alasa: {
    noun: [],
    adjective: [],
    adverb: [],
    gerundVerb: ["searching"],
    pastTransitive: ["hunted", "searched"],
    presentTransitive: ["hunt", "search"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // ale/ali
  // Linku: all, every, everything, entirety; any, anything; (number) one hundred
  ale: {
    noun: ["everything", "anything", "entirety", "100"],
    adjective: ["all", "every", "100"],
    adverb: ["completely"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  ali: {
    noun: ["everything", "anything", "entirety", "100"],
    adjective: ["all", "every", "100"],
    adverb: ["completely"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // anpa
  // Linku: bowing down, downward, humble, lowly, dependent | ALT bottom, lower part, under, below, floor, beneath; low, lower, bottom, down
  // Duplicates:
  //   - bottom, lower part - bottom is preferred due to having one word
  //   - under, below - below is preferred
  anpa: {
    noun: ["bottom", "below", "floor"],
    adjective: [
      "bowing down",
      "downward",
      "humble",
      "lowly",
      "dependent",
      "low",
      "lower",
      "bottom",
      "down",
    ],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // ante
  // Linku: change, difference, modification; other, altered; to modify
  ante: {
    noun: [
      "change",
      "changes",
      "difference",
      "differences",
      "modification",
      "modifications",
    ],
    adjective: ["different", "other", "altered"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["modified"],
    presentTransitive: ["modify"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // awen
  // Linku: enduring, kept, protected, safe, waiting, staying; (pv.) to continue to, to keep
  // Duplicates:
  //   - waiting, staying (not really, one could stay and not wait, one could wait and not stay)
  awen: {
    noun: ["waiting", "staying"],
    adjective: ["enduring", "kept", "protected", "safe", "waiting", "staying"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // esun
  // Linku: trade, barter, exchange, swap, buy, sell; market, shop, fair, bazaar, place of business
  // Duplicates:
  //   - market, shop, fair, bazaar - shop is preferred
  esun: {
    noun: ["shop", "shops"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [
      "traded",
      "bartered",
      "exchanged",
      "swapped",
      "bought",
      "sold",
    ],
    presentTransitive: ["trade", "barter", "exchange", "swap", "buy", "sell"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // ijo
  // Linku: thing, phenomenon, object, matter
  //   - thing, object - object is preferred
  ijo: {
    noun: [
      "phenomenon",
      "phenomenons",
      "object",
      "objects",
      "matter",
      "matters",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // ike
  // Linku: negative quality, e.g. bad, unpleasant, harmful, unneeded
  ike: {
    noun: ["negative quality"],
    adjective: ["bad", "unpleasant", "harmful", "unneeded"],
    adverb: ["badly", "unpleasantly", "harmfully"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // ilo
  // Linku: tool, implement, machine, device
  // Duplicates:
  //   - machine, device - machine is preferred
  ilo: {
    noun: ["tool", "tools", "implement", "implements", "machine", "machines"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // insa
  // Linku: centre, content, inside, between; internal organ, stomach
  insa: {
    noun: ["centre", "content", "contents", "inside"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // jaki
  // Linku: disgusting, obscene, sickly, toxic, unclean, unsanitary
  // Duplicates:
  //   - disgusting, obscene - disgusting is preferred
  //   - unclean, unsanitary - unclean is preferred
  jaki: {
    noun: ["obscenity", "obscenities"],
    adjective: ["disgusting", "sickly", "toxic", "unclean"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // jan
  // Linku: human being, person, somebody
  jan: {
    noun: ["human being", "person", "people", "somebody"],
    adjective: ["person-like"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // jelo
  // Linku: yellow, amber, golden, lime yellow, yellowish orange
  // Removed: amber could be confused with the tree resin
  jelo: {
    noun: ["yellow", "lime yellow", "yellowish orange"],
    adjective: ["yellow", "golden", "lime yellow", "yellowish orange"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // jo
  // Linku: to have, carry, contain, hold
  jo: {
    noun: ["possession", "possessions"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["had", "carried", "contained", "held"],
    presentTransitive: ["have", "carry", "contain", "hold"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // kala
  // Linku: fish, marine animal, sea creature
  // Duplicates
  //   - marine animal, sea creature - sea creature is preferred
  kala: {
    noun: ["fish", "fishes", "sea creature", "sea creatures"],
    adjective: ["fish-like", "swimming"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // kalama
  // Linku: to produce a sound; recite, utter aloud
  kalama: {
    noun: ["sound", "sounds"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: ["sounded"],
    presentIntransitive: ["sound"],
  },
  // kama
  // Linku: arriving, coming, future, summoned; (pv.) to become, manage to, succeed in
  // Duplicates:
  //   - arriving, coming - arriving is preferred
  kama: {
    noun: ["arriving", "future"],
    adjective: ["arriving", "future", "summoned"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // kasi
  // Linku: plant, vegetation; herb, leaf
  // Duplicates:
  //   - plant, vegetation - plant is preferred
  kasi: {
    noun: ["plant", "plants", "herb", "herbs", "leaf", "leaves"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // ken
  // Linku: to be able to, be allowed to, can, may; possible
  ken: {
    noun: ["ability", "abilities", "possibility", "possibilities"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // kepeken
  // Linku: to be able to, be allowed to, can, may; possible
  kepeken: {
    noun: [],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // kili
  // Linku: fruit, vegetable, mushroom
  kili: {
    noun: [
      "fruit",
      "fruits",
      "vegetable",
      "vegetables",
      "mushroom",
      "mushrooms",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // kiwen
  // Linku: hard object, metal, rock, stone
  kiwen: {
    noun: [
      "hard object",
      "hard objects",
      "metal",
      "metals",
      "rock",
      "rocks",
      "stone",
      "stones",
    ],
    adjective: ["hard"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // ko
  // Linku: semi-solid, e.g. paste, powder, goo, sand, soil, clay; squishy, moldable
  ko: {
    noun: ["semi-solid", "paste", "powder", "goo", "sand", "soil", "clay"],
    adjective: ["squishy", "moldable"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // kon
  // Linku: air, breath; essence, spirit; hidden reality, unseen agent
  kon: {
    noun: [
      "air",
      "breath",
      "essence",
      "spirit",
      "hidden reality",
      "unseen agent",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // kule
  // Linku: color, pigment; category, genre, flavor; relating to queerness, relating to the LGBT+ community
  // Duplicates:
  //   - category, genre - category is preferred
  kule: {
    noun: [
      "color",
      "colors",
      "pigment",
      "pigments",
      "category",
      "categories",
      "flavor",
      "flavors",
      "queerness",
    ],
    adjective: ["colorful", "queer"],
    adverb: ["colorfully"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // kulupu
  // Linku: community, company, group, nation, society, tribe
  kulupu: {
    noun: [
      "community",
      "communities",
      "company",
      "companies",
      "group",
      "groups",
      "nation",
      "nations",
      "society",
      "tribe",
      "tribes",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // kute
  // Linku: ear; to hear, listen; pay attention to, obey
  kute: {
    noun: ["ear", "ears", "listening"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["listened"],
    presentTransitive: ["listen"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // lape
  // Linku: sleep, rest, break from an activity or work
  lape: {
    noun: ["sleep", "rest"],
    adjective: ["sleeping", "resting"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: ["slept", "rested"],
    presentIntransitive: ["sleep", "rest"],
  },
  // laso
  // Linku: turquoise, blue, green, cyan, indigo, lime green
  laso: {
    noun: ["turquoise", "blue", "green", "cyan", "indigo", "lime green"],
    adjective: ["turquoise", "blue", "green", "cyan", "indigo", "lime green"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // lawa
  // Linku: head, mind; to control, direct, guide, lead, own, plan, regulate, rule
  lawa: {
    noun: ["head", "heads", "mind", "minds", "guide", "plan", "rule"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [
      "controlled",
      "directed",
      "guided",
      "led",
      "owned",
      "regulated",
      "ruled",
    ],
    presentTransitive: [
      "control",
      "direct",
      "guide",
      "lead",
      "own",
      "regulate",
      "rule",
    ],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // len
  // Linku: cloth, clothing, fabric, textile; cover, layer of privacy
  // Duplicates:
  //   - cloth, fabric, textile - fabric is preferred
  len: {
    noun: ["clothing", "fabric", "hiding"],
    adjective: ["hidden"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["covered"],
    presentTransitive: ["cover"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // lete
  // Linku: cool, cold, frozen; freeze
  lete: {
    noun: ["coldness"],
    adjective: ["cool", "cold", "frozen"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["froze"],
    presentTransitive: ["freeze"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // lili
  // Linku: small, short, young; few; piece of
  // TODO: cover "piece of" as special prefix
  lili: {
    noun: ["smallness"],
    adjective: ["small", "short", "young", "few"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // linja
  // Linku: long and flexible thing; cord, hair, rope, thread, yarn | ALT line, connection
  // Duplicates:
  //   - thread, yarn - thread is preferred
  linja: {
    noun: [
      "long flexible thing",
      "long flexible things",
      "cord",
      "cords",
      "hair",
      "rope",
      "ropes",
      "line",
      "lines",
      "connection",
      "connections",
    ],
    adjective: ["long flexible"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // lipu
  // Linku: flat object; book, document, card, paper, record, website
  lipu: {
    noun: [
      "flat object",
      "book",
      "books",
      "document",
      "documents",
      "card",
      "cards",
      "paper",
      "papers",
      "record",
      "records",
      "website",
      "websites",
    ],
    adjective: ["flat"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // loje
  // Linku: red, magenta, scarlet, pink, rust-colored, reddish orange
  loje: {
    noun: ["red", "magenta", "scarlet", "pink", "rust-color", "reddish orange"],
    adjective: [
      "red",
      "magenta",
      "scarlet",
      "pink",
      "rust-colored",
      "reddish orange",
    ],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // lon
  // Linku: located at, present at, real, true, existing
  lon: {
    noun: ["truth"],
    adjective: ["real", "truth", "existing"],
    adverb: ["truthfully"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // luka
  // Linku: hand, arm, tactile organ, grasping organ; (number) five
  luka: {
    noun: [
      "hand",
      "hands",
      "arm",
      "arms",
      "tactile organ",
      "tactile organs",
      "grasping organ",
      "grasping organs",
      "5",
    ],
    adjective: ["5"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // lukin
  // Linku: look, view, examine, read, watch; appearance, visual; eye, seeing organ; (preverb) try to
  // Duplicate:
  //   - look and view - view is preferred
  lukin: {
    noun: ["appearance", "visual", "eye", "seeing organ", "seeing organs"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["viewed", "read", "watched"],
    presentTransitive: ["view", "read", "watch"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // lupa
  // Linku: hole, pit, cave, doorway, window, portal
  lupa: {
    noun: [
      "hole",
      "holes",
      "pit",
      "cave",
      "caves",
      "doorway",
      "window",
      "windows",
      "portal",
      "portals",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // ma
  // Linku: earth, land; outdoors, world; country, territory; soil
  ma: {
    noun: [
      "earth",
      "land",
      "outdoors",
      "world",
      "country",
      "territory",
      "soil",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // mama
  // Linku: parent, ancestor; creator, originator; caretaker, sustainer, guardian
  mama: {
    noun: [
      "parent",
      "parents",
      "ancestor",
      "ancestors",
      "creator",
      "creators",
      "originator",
      "originators",
      "caretaker",
      "caretakers",
      "sustainer",
      "guardian",
      "guardians",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // mani
  // Linku: money, cash, savings, wealth; large domesticated animal
  mani: {
    noun: [
      "money",
      "cash",
      "savings",
      "wealth",
      "large domestic animal",
      "large domestic animals",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // meli
  // Linku: woman, female, feminine person; wife
  meli: {
    noun: [
      "woman",
      "women",
      "female",
      "feminine person",
      "feminine people",
      "wife",
    ],
    adjective: ["woman", "female", "feminine"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // mi
  // Linku: I, me, we, us
  mi: {
    noun: ["I", "me", "we", "us"],
    adjective: ["my", "our"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // mije
  // Linku: man, male, masculine person; husband
  mije: {
    noun: [
      "man",
      "men",
      "male",
      "masculine person",
      "masculine people",
      "husband",
    ],
    adjective: ["man", "male", "masculine"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // moku
  // Linku: to eat, drink, consume, swallow, ingest
  // Duplicate:
  //   - swallow, ingest - either way is fine
  // NOTE: should I use drank or drunk?
  moku: {
    noun: ["food", "foods", "drink", "drinks"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["ate", "drank", "consumed", "ingested"],
    presentTransitive: ["eat", "drink", "consume", "ingest"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // moli
  // Linku: dead, dying
  moli: {
    noun: ["death"],
    adjective: ["dead", "dying"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["killed"],
    presentTransitive: ["kill"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // monsi
  // Linku: back, behind, rear
  monsi: {
    noun: ["back", "behind", "rear"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // mu
  // Linku: (animal noise or communication) | ALT (non-speech vocalization)
  // TODO: this is a tricky word
  mu: {
    noun: ["*noises*"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // mun
  // Linku: moon, night sky object, star, celestial body
  mun: {
    noun: [
      "moon",
      "night sky object",
      "night sky objects",
      "star",
      "stars",
      "celestial body",
      "celestial bodies",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // musi
  // Linku: fun, game, entertainment, art, play, amusing, interesting, comical, silly
  musi: {
    noun: ["fun", "game", "games", "entertainment", "art", "arts", "play"],
    adjective: ["fun", "amusing", "interesting", "comical", "silly"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: ["had fun"],
    presentIntransitive: ["have fun"],
  },
  // mute
  // Linku: many, several, very; quantity; (number) twenty
  mute: {
    noun: ["many", "20"],
    adjective: ["many", "several"],
    adverb: ["very"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // nanpa
  // Linku: -th (ordinal number); numbers
  nanpa: {
    noun: ["number", "numbers"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // nasa
  // Linku: unusual, strange; silly; drunk, intoxicated
  nasa: {
    noun: ["silliness", "strangeness"],
    adjective: ["unusual", "strange", "silly", "drunk", "intoxicated"],
    adverb: ["strangely"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // nasin
  // Linku: way, custom, doctrine, method, path, road
  // Duplicate:
  //   - path, road - path is preferred
  nasin: {
    noun: [
      "way",
      "ways",
      "custom",
      "customs",
      "doctrine",
      "doctrines",
      "method",
      "methods",
      "path",
      "paths",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // nena
  // Linku: bump, button, hill, mountain, nose, protuberance
  nena: {
    noun: [
      "bump",
      "bumps",
      "hill",
      "hills",
      "mountain",
      "nose",
      "noses",
      "protuberance",
      "protuberances",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // ni
  // Linku: that, this
  ni: {
    noun: ["this", "that"],
    adjective: ["this", "that"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // nimi
  // Linku: name, word
  nimi: {
    noun: ["name", "names", "word", "words"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // noka
  // Linku: foot, leg, organ of locomotion, roots
  noka: {
    noun: [
      "foot",
      "feet",
      "leg",
      "legs",
      "locomotive organ",
      "locomotive organs",
      "roots",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // olin
  // Linku: to have a strong emotional bond (with), e.g. affection, appreciation, (respect), platonic, romantic or familial relationships
  olin: {
    noun: ["affection", "appreciation", "respect", "relationship"],
    adjective: ["platonic", "romantic", "familial"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["respected"],
    presentTransitive: ["respect"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // ona
  // Linku: he, she, it, they
  // Removed he and she
  ona: {
    noun: ["they", "them", "it"],
    adjective: ["their", "its"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // open
  // Linku: begin, start; open; turn on
  open: {
    noun: ["beginning", "start"],
    adjective: ["open", "turned on"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["started", "turned on"],
    presentTransitive: ["start", "turn on"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // pakala
  // Linku: botched, broken, damaged, harmed, messed up | ALT (curse expletive, e.g. fuck!)
  pakala: {
    noun: ["mess", "damage", "damages"],
    adjective: ["botched", "broken", "damaged", "harmed", "messed up"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["botched", "broke", "damaged", "harmed", "messed up"],
    presentTransitive: ["botch", "break", "damage", "harm", "mess up"],
    pastIntransitive: [],
    presentIntransitive: [],
    interjection: ["pakala"],
  },
  // pan
  // Linku: grains, starchy foods, baked goods; e.g. rice, sorghum, bread, noodles, masa, porridge, injera
  // NOTE: should I put these examples? NAH
  pan: {
    noun: ["grain", "grains", "starchy food", "starchy foods", "baked goods"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // pana
  // Linku: give, send, emit, provide, put, release
  pana: {
    noun: [],
    adjective: [],
    adverb: [],
    gerundVerb: ["giving"],
    pastTransitive: ["gave", "sent", "emitted", "provided", "put", "released"],
    presentTransitive: ["give", "send", "emit", "provide", "put", "release"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // pali
  // Linku: do, take action on, work on; build, make, prepare
  pali: {
    noun: [],
    adjective: [],
    adverb: [],
    gerundVerb: ["doing", "working", "build", "made", "prepared"],
    pastTransitive: ["do", "work", "build", "make", "prepare"],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // palisa
  // Linku: long hard thing; branch, rod, stick
  palisa: {
    noun: [
      "long hard thing",
      "long hard things",
      "branch",
      "branches",
      "rod",
      "rods",
      "stick",
      "sticks",
    ],
    adjective: ["long hard"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // pilin
  // Linku: heart (physical or emotional); feeling (an emotion, a direct experience)
  pilin: {
    noun: ["heart", "feeling", "feelings"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["touched", "felt"],
    presentTransitive: ["touch", "feel"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // pimeja
  // Linku: dark, unlit; dark color, e.g. black, purple, brown
  // Duplicates:
  //   - dark, unlit - dark is preferred
  pimeja: {
    noun: ["darkness", "dark color"],
    adjective: ["dark", "unlit", "black", "purple", "brown"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // pini
  // Linku: ago, completed, ended, finished, past
  // Duplicates:
  //   - completed, ended, finished - ended is preferred
  pini: {
    noun: ["past"],
    adjective: ["ago", "ended"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // pipi
  // Linku: bug, insect, ant, spider
  // Overlap:
  //   - ant as insect
  //   - spider as bug
  pipi: {
    noun: ["insect", "insects", "bug", "bugs"],
    adjective: ["bug-like", "insect-like"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // poka
  // Linku: hip, side; next to, nearby, vicinity | ALT along with (comitative), beside
  poka: {
    noun: ["hip", "hips", "side", "sides", "vicinity"],
    adjective: ["nearby"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // poki
  // Linku: container, bag, bowl, box, cup, cupboard, drawer, vessel
  // Overlaps
  poki: {
    noun: ["container", "containers"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // pona
  // Linku: good, positive, useful; friendly, peaceful; simple
  pona: {
    noun: ["goodness", "simplicity"],
    adjective: ["good", "positive", "useful", "friendly", "peaceful", "simple"],
    adverb: ["nicely"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // pu
  // Linku: to interact with the book Toki Pona: The Language of Good (2014) by Sonja Lang
  // TODO: Maybe special suffix: "with the book", "related to the book"
  pu: {
    noun: [],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // sama
  // Linku: same, similar; each other; sibling, peer, fellow; as, like
  sama: {
    noun: ["similarity", "sibling", "peer", "fellow"],
    adjective: ["same", "similar"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // seli
  // Linku: fire; cooking element, chemical reaction, heat source
  seli: {
    noun: [
      "fire",
      "cooking element",
      "cooking elements",
      "chemical reaction",
      "chemical reactions",
      "heat source",
      "heat sources",
    ],
    adjective: ["hot"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["heated"],
    presentTransitive: ["heat"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // selo
  // Linku: outer form, outer layer; bark, peel, shell, skin; boundary
  // Duplicates:
  //   - bark, peel, shell, skin - skin is preferred
  selo: {
    noun: ["outer form", "outer layer", "skin", "boundary"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // seme
  // Linku: what? which?
  seme: {
    noun: ["what", "which"],
    adjective: ["what", "which"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // sewi
  // Linku: area above, highest part, something elevated; awe-inspiring, divine, sacred, supernatural
  sewi: {
    noun: ["area above", "highest part"],
    adjective: [
      "highest",
      "elevated",
      "awe-inspiring",
      "divine",
      "sacred",
      "supernatural",
    ],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // sijelo
  // Linku: body (of person or animal), physical state, torso
  sijelo: {
    noun: ["body", "bodies", "physical state", "physical states", "torso"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // sike
  // Linku: round or circular thing; ball, circle, cycle, sphere, wheel; of one year
  sike: {
    noun: ["round thing", "round things", "cycle"],
    adjective: ["round"],
    adverb: ["repeatedly"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // sin
  // Linku: new, fresh; additional, another, extra
  sin: {
    noun: ["newness"],
    adjective: ["new", "fresh", "additional", "another", "extra"],
    adverb: ["newly"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // sina
  // Linku: you
  sina: {
    noun: ["you"],
    adjective: ["your"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // sinpin
  // Linku: face, foremost, front, wall
  sinpin: {
    noun: ["face", "faces", "wall", "walls"],
    adjective: ["foremost"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // sitelen
  // Linku: image, picture, representation, symbol, mark, writing
  sitelen: {
    noun: [
      "image",
      "images",
      "picture",
      "pictures",
      "representation",
      "symbol",
      "symbols",
      "mark",
      "marks",
      "writing",
      "writings",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // sona
  // Linku: know, be skilled in, be wise about, have information on; (pv.) know how to
  sona: {
    noun: ["knowledge"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // soweli
  // Linku: fuzzy creature, land animal, beast
  soweli: {
    noun: [
      "fuzzy creature",
      "fuzzy creatures",
      "land animal",
      "land animals",
      "beast",
      "beasts",
    ],
    adjective: ["animal-like"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // suli
  // Linku: big, heavy, large, long, tall; important; adult
  // Duplicates:
  //   - big, large - big is preferred
  suli: {
    noun: ["hugeness", "importance"],
    adjective: ["big", "heavy", "important", "adult"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // suno
  // Linku: sun; light, brightness, glow, radiance, shine; light source
  suno: {
    noun: ["sun", "light", "brightness", "glow", "radiance", "light source"],
    adjective: ["shining"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // supa
  // Linku: horizontal surface, thing to put or rest something on
  supa: {
    noun: ["horizontal surface", "horizontal surfaces"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // suwi
  // Linku: sweet, fragrant; cute, innocent, adorable
  // Duplicates:
  //   - cute, adorable - cute is preferred
  suwi: {
    noun: ["sweetness", "cuteness", "innocence"],
    adjective: ["sweet", "cute", "innocent"],
    adverb: ["sweetly"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // tan
  // Linku: by, from, because of; origin, cause
  tan: {
    noun: ["origin", "cause"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // taso
  // Linku: but, however; only
  taso: {
    noun: [],
    adjective: ["only"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // tawa
  // Linku: motion, e.g. walking, shaking, flight, travel; (preposition) to, for, going to, from the perspective of
  // Duplicates:
  //   - flight, travel - travel is preferred
  tawa: {
    noun: ["motion", "travel"],
    adjective: ["walking", "shaking"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // telo
  // Linku: water, liquid, fluid, wet substance; beverages
  // Duplicates:
  //   - liquid, fluid - liquid is preferred
  telo: {
    noun: ["water", "liquid", "fluid", "wet substance", "beverages"],
    adjective: ["liquid", "wet"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // tenpo
  // Linku: time, duration, moment, occasion, period, situation
  tenpo: {
    noun: ["time", "duration", "moment", "occasion", "period", "situation"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // toki
  // Linku: communicate, say, speak, talk, use language, think; hello
  // These are all overlaps
  toki: {
    noun: [
      "communication",
      "communications",
      "language",
      "languages",
    ],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["communicated"],
    presentTransitive: ["communicate"],
    pastIntransitive: [],
    presentIntransitive: [],
    interjection: ["hello"],
  },
  // tomo
  // Linku: indoor space; building, home, house, room
  // Duplicates:
  //   - indoor space, room - room is preferred
  tomo: {
    noun: ["building", "home", "house", "room"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // tonsi
  // Linku: nonbinary, gender nonconforming, genderqueer, transgender*
  tonsi: {
    noun: [
      "non-binary person",
      "non-binary people",
      "gender nonconforming person",
      "gender nonconforming people",
      "genderqueer person",
      "genderqueer people",
      "transgender person",
      "transgender people",
    ],
    adjective: [
      "non-binary",
      "gender-nonconforming",
      "genderqueer",
      "transgender",
    ],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // tu
  // Linku: (number) two; separate, divide, split; multiply, duplicate
  tu: {
    noun: ["2"],
    adjective: ["2"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [
      "separated",
      "divided",
      "split",
      "multiplied",
      "duplicated",
    ],
    presentTransitive: ["separate", "divide", "split", "multiply", "duplicate"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // unpa
  // Linku: have sexual relations with
  unpa: {
    noun: ["sex"],
    adjective: ["sexual"],
    adverb: ["sexually"],
    gerundVerb: [],
    pastTransitive: ["had sex with"],
    presentTransitive: ["have sex with"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // uta
  // Linku: mouth, lips, oral cavity, jaw
  uta: {
    noun: ["mouth", "lips", "oral cavity", "jaw"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // utala
  // Linku: battle, challenge, compete against, struggle against
  utala: {
    noun: ["battle", "challenge"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["competed against", "struggled against"],
    presentTransitive: ["compete against", "struggle against"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // walo
  // Linku: light-colored, white, pale, light gray, cream
  // Removed cream - it may be confused with the actual thing
  walo: {
    noun: ["light-color", "white", "light gray"],
    adjective: ["light-colored", "white", "pale", "light gray"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // wan
  // Linku: (number) one; singular; combine, join, mix, fuse
  wan: {
    noun: ["1"],
    adjective: ["1", "singular"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: ["combined", "mixed", "fused"],
    presentTransitive: ["combine", "mix", "fuse"],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // waso
  // Linku: bird, flying creature, winged animal
  waso: {
    noun: [
      "bird",
      "birds",
      "flying creature",
      "flying creatures",
      "winged animal",
      "winged animals",
    ],
    adjective: ["bird-like", "flying"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // wawa
  // Linku: strong, powerful; confident, sure; energetic, intense
  wawa: {
    noun: ["power", "powers", "confidence", "energy", "intensity"],
    adjective: ["strong", "powerful", "confident", "energetic", "intense"],
    adverb: ["powerfully"],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
  // weka
  // Linku: absent, away, ignored
  weka: {
    noun: ["leaving"],
    adjective: ["absent", "away", "ignored"],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: ["leave"],
    presentIntransitive: ["leave"],
  },
  // wile
  // Linku:want, desire, wish, require; (preverb) want to
  wile: {
    noun: ["want", "wants", "need", "needs"],
    adjective: [],
    adverb: [],
    gerundVerb: [],
    pastTransitive: [],
    presentTransitive: [],
    pastIntransitive: [],
    presentIntransitive: [],
  },
};
