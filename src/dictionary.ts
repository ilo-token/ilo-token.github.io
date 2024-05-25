/**
 * Module for describing word to word translations. More information here:
 * https://github.com/ilo-token/ilo-token.github.io/wiki/Guidelines-for-editing-dictionary
 */

/** */
export const PARTICLE_DEFINITION: { [word: string]: Array<string> } = {
  a: [
    "ah",
    "oh",
    "ha",
    "eh",
    "um",
    "oy",
    "[placed after something for emphasis or emotion]",
  ],
  ala: [
    "not",
    "[negates a word or phrase]",
    "[forms a yes-no question]",
  ],
  anu: [
    "or",
    "[separates multiple possibilities, replacing another particle]",
  ],
  e: [
    "[marks the start of a direct object]",
  ],
  en: [
    "[separates multiple subjects]",
  ],
  kin: [
    "too",
    "also",
    "as well",
    "additionally",
    "[after phrase or at sentence start]",
  ],
  la: [
    "[mark the previous statement as context to a following statement]",
  ],
  li: [
    "[marks the start of an indicative verb (statement)]",
  ],
  n: [
    "hm",
    "uh",
    "mm",
    "er",
    "umm",
    "[indicate thinking or pause]",
  ],
  nanpa: [
    "-th",
    "[ordinal number]",
  ],
  o: [
    "should",
    "[marks the end of a vocative (who is being spoken to)]",
    "[marks the start of an imperative (command, wish, instruction)]",
  ],
  pi: [
    "[modify the next word with one or more following words]",
  ],
  seme: [
    "what",
    "which",
    "who",
    "[indicate a question by marking missing info in a sentence]",
  ],
  taso: [
    "but",
    "however",
    "[marks a sentence as qualifying or contradictory]",
  ],
};
export const SPECIAL_CONTENT_WORD_DEFINITION: {
  [word: string]: Array<string>;
} = {
  jasima: [
    "opposite of",
  ],
  kokosila: [
    "to speak a non-Toki Pona language in an environment where Toki Pona is \
    more appropriate",
  ],
  ku: [
    "interacting with the Toki Pona Dictionary by Sonja Lang",
  ],
  lili: [
    "piece of",
  ],
  mu: [
    "(animal noise or communication, onomatopoeia)",
  ],
  ni: [
    "this",
    "that",
    "these",
    "those",
  ],
  pu: [
    "to interact with the book Toki Pona: The Language of Good by Sonja Lang",
  ],
  su: [
    "interacting with a book from the illustrated story book series that \
    began with The Wonderful Wizard of Oz, produced by Sonja Lang",
  ],
};
export const PREPOSITION_DEFINITION: { [word: string]: Array<string> } = {
  kepeken: ["using"],
  lon: ["at"],
  sama: ["similar to"],
  tan: ["from", "because of"],
  tawa: ["towards", "in perspective of"],
};
export const PREVERB_DEFINITION: { [word: string]: Array<never> } = {
  alasa: [], // Will be duplicated with lukin
  awen: [],
  kama: [],
  ken: [],
  lukin: [],
  open: [],
  pini: [],
  sona: [],
  wile: [],
};
PREVERB_DEFINITION.alasa = PREVERB_DEFINITION.lukin;
export const NUMERAL_DEFINITION: { [word: string]: number } = {
  ala: 0,
  wan: 1,
  tu: 2,
  luka: 5,
  mute: 20,
  ale: 100,
  ali: 100,
};
export const CONTENT_WORD_DEFINITION: { [word: string]: Array<Definition> } = {
  akesi: [
    noun("reptile(s)"),
    noun("amphibian(s)"),
    adjective("reptilian", "qualifier"),
    adjective("amphibian", "qualifier"),
  ],
  ala: [
    determiner("no", "quantifier", "zero"),
    indefinitePronoun("nothing"),
  ],
  alasa: [
    verb("hunt(ed)", "hunting"),
    verb("search(ed)", "searching"),
  ],
  ale: [
    indefinitePronoun("everything"),
    indefinitePronoun("anything"),
    singularNoun("entirety"),
    determiner("all", "distributive", "plural"),
    determiner("every", "distributive", "plural"),
    adverb("completely"),
  ],
  ali: [], // Will be duplicated with "ale"
  anpa: [
    singularNoun("bottom"),
    singularNoun("below"),
    singularNoun("floor"),
    adjective("downward", "origin"),
    adjective("humble", "opinion"),
    adjective("lowly", "opinion"),
    adjective("dependent", "opinion"),
    adjective("low", "size"),
    adjective("lower", "origin"),
    adjective("bottom", "origin"),
    adjective("down", "origin"),
    verb("bow(ed) down", "bowing down"),
  ],
  ante: [
    noun("change(s)"),
    noun("difference(s)"),
    noun("modification(s)"),
    adjective("different", "opinion"),
    adjective("other", "opinion"),
    verb("change(d)", "changing"),
    verb("alter(ed)", "altering"),
  ],
  anu: [
    verb({
      presentPast: "choose/chose",
      pastParticiple: "chosen",
      gerund: "choosing",
    }),
    intransitiveVerb("decide(d)", "deciding"),
  ],
  awen: [
    intransitiveVerb("wait(ed)", "waiting"),
    intransitiveVerb("stay(ed)", "staying"),
    intransitiveVerb("endure(d)", "enduring"),
    verb("keep/kept", "keeping"),
    verb("protect(ed)", "protecting"),
  ],
  epiku: [
    adjective("epic", "opinion"),
    adjective("cool", "opinion"),
    adjective("awesome", "opinion"),
    adjective("amazing", "opinion"),
  ],
  esun: [
    noun("shop(s)"),
    verb("trade(d)", "trading"),
    verb("barter(ed)", "bartering"),
    verb("exchange(d)", "exchanging"),
    verb("swap(ped)", "swapping"),
    verb("buy/bought", "buying"),
    verb("sell/sold", "selling"),
  ],
  ijo: [
    noun("phenomenon(s)"),
    noun("object(s)"),
    noun("matter(s)"),
  ],
  ike: [
    adjectiveNounPhrase(
      [adjective("negative", "opinion")],
      noun("quality/qualities"),
    ),
    adjective("bad", "opinion"),
    adjective("unpleasant", "opinion"),
    adjective("harmful", "opinion"),
    adjective("unneeded", "opinion"),
    adverb("badly"),
    adverb("unpleasantly"),
    adverb("harmfully"),
  ],
  ilo: [
    noun("tool(s)"),
    noun("implement(s)"),
    noun("machine(s)"),
  ],
  insa: [
    singularNoun("center"),
    noun("content(s)"),
    noun("inside(s)"),
  ],
  jaki: [
    noun("obscenity/obscenities"),
    adjective("disgusting", "opinion"),
    adjective("sickly", "opinion"),
    adjective("toxic", "opinion"),
    adjective("unclean", "opinion"),
  ],
  jan: [
    singularNoun("human being"),
    noun("person/people"),
    indefinitePronoun("somebody"),
  ],
  jasima: [
    noun("reflection(s)"),
    noun("mirror(s)"),
    verb("reflect(ed)", "reflecting"),
    verb("resound(ed)", "resounding"),
    verb("mirror(ed)", "mirroring"),
  ],
  jelo: [
    singularNoun("yellow"),
    adjectiveNounPhrase(
      [adjective("lime", "color")],
      singularNoun("yellow"),
    ),
    adjectiveNounPhrase(
      [adjective("yellowish", "color")],
      singularNoun("orange"),
    ),
    adjective("yellow", "color"),
    adjective("golden", "color"),
    adverbAdjectivePhrase([adverb("lime")], adjective("yellow", "color")),
    adverbAdjectivePhrase([adverb("yellowish")], adjective("orange", "color")),
  ],
  jo: [
    // verb("have/had", "having"),
    verb("carry/carried", "carrying"),
    verb("contain(ed)", "containing"),
    verb("hold/held", "holding"),
  ],
  kala: [
    noun("fish(es)"),
    adjectiveNounPhrase([adjective("sea", "qualifier")], noun("creature(s)")),
    intransitiveVerb("swim/swam", "swimming"),
  ],
  kalama: [
    noun("sound(s)"),
    // intransitiveVerb("sound(ed)", "sounding"),
    verbObjectPhrase(verb("make/made", "making"), noun("sound(s)")),
  ],
  kama: [
    singularNoun("future"),
    adjective("future", "age"),
    verb("summon(ed)", "summoning"),
    intransitiveVerb("arrive(d)", "arriving"),
  ],
  kasi: [
    noun("plant(s)"),
    noun("herb(s)"),
    noun("leaf/leaves"),
  ],
  ken: [
    noun("ability/abilities"),
    noun("possibility/possibilities"),
  ],
  kepeken: [
    verb("use(d)", "using"),
  ],
  kijetesantakalu: [
    noun("raccoon(s)"),
    noun("coati(s)"),
    noun("kinkajou(s)"),
    noun("olingo(s)"),
    noun("ringtail(s)"),
    noun("cacomistle(s)"),
    noun("weasel(s)"),
    noun("otter(s)"),
    noun("skunk(s)"),
    noun("red panda(s)"),
  ],
  kili: [
    noun("fruit(s)"),
    noun("vegetable(s)"),
    noun("mushroom(s)"),
  ],
  kipisi: [
    adjective("sharp", "physical quality"),
    verb("split(ted)", "splitting"),
    verb("cut", "cutting"),
    verb("slice(d)", "slicing"),
    verb("sever(ed)", "severing"),
  ],
  kiwen: [
    adjectiveNounPhrase(
      [adjective("hard", "material")],
      noun("object(s)"),
    ),
    noun("metal(s)"),
    noun("rock(s)"),
    noun("stone(s)"),
    adjective("hard", "material"),
  ],
  ko: [
    singularNoun("semi-solid"),
    singularNoun("paste"),
    singularNoun("powder"),
    singularNoun("goo"),
    singularNoun("sand"),
    singularNoun("soil"),
    singularNoun("clay"),
    adjective("squishy", "material"),
    adjective("moldable", "material"),
  ],
  kokosila: [], // Special case
  kon: [
    singularNoun("air"),
    singularNoun("breath"),
    noun("essence(s)"),
    noun("spirit(s)"),
    adjectiveNounPhrase(
      [adjective("hidden", "physical quality")],
      noun("reality/realities"),
    ),
    adjectiveNounPhrase(
      [adjective("unseen", "physical quality")],
      noun("agent(s)"),
    ),
  ],
  ku: [], // Special case
  kule: [
    noun("color(s)"),
    noun("pigment(s)"),
    noun("category/categories"),
    noun("flavor(s)"),
    singularNoun("queerness"),
    adjective("colorful", "color"),
    adjective("queer", "qualifier"),
    adverb("colorfully"),
  ],
  kulupu: [
    noun("community/communities"),
    noun("company/companies"),
    noun("group(s)"),
    noun("nation(s)"),
    noun("society/societies"),
    noun("tribe(s)"),
  ],
  kute: [
    noun("ear(s)"),
    verb({
      presentPast: "listen(ed)",
      gerund: "listening",
      usePreposition: "at",
    }),
  ],
  lanpan: [
    verb({
      presentPast: "take/took",
      pastParticiple: "taken",
      gerund: "taking",
    }),
    verb("seize(d)", "seizing"),
    verb("catch(ed)", "catching"),
    verb("receive(d)", "receiving"),
    // verb("get/got", "getting"),
  ],
  lape: [
    singularNoun("sleep"),
    singularNoun("rest"),
    intransitiveVerb("sleep/slept", "sleeping"),
    intransitiveVerb("rest(ed)", "resting"),
  ],
  laso: [
    singularNoun("turquoise"),
    singularNoun("blue"),
    singularNoun("green"),
    singularNoun("cyan"),
    singularNoun("indigo"),
    adjectiveNounPhrase([adjective("lime", "color")], singularNoun("green")),
    adjective("turquoise", "color"),
    adjective("blue", "color"),
    adjective("green", "color"),
    adjective("cyan", "color"),
    adjective("indigo", "color"),
    adverbAdjectivePhrase([adverb("lime")], adjective("green", "color")),
  ],
  lawa: [
    noun("head(s)"),
    noun("mind(s)"),
    noun("guide(s)"),
    noun("plan(s)"),
    noun("rule(s)"),
    verb("control(led)", "controlling"),
    verb("direct(ed)", "directing"),
    verb("guide(d)", "guiding"),
    verb("lead/led", "leading"),
    verb("own(ed)", "owning"),
    verb("regulate(d)", "regulating"),
    verb("rule(d)", "ruling"),
  ],
  leko: [
    pluralNoun("stairs"),
    noun("square(s)"),
    noun("block(s)"),
    noun("corner(s)"),
    noun("cube(s)"),
  ],
  len: [
    noun("clothing(s)"),
    noun("fabric(s)"),
    // adjective("hidden", "origin"),
    verb("cover(ed)", "covering"),
    verb({
      presentPast: "hide/hid",
      pastParticiple: "hidden",
      gerund: "hiding",
    }),
  ],
  lete: [
    singularNoun("coldness"),
    adjective("cool", "physical quality"),
    adjective("cold", "physical quality"),
    // adjective("frozen", "physical quality"),
    verb("cool(ed)", "cooling"),
    verb({
      presentPast: "freeze/froze",
      pastParticiple: "frozen",
      gerund: "freezing",
    }),
  ],
  lili: [
    singularNoun("smallness"),
    adjective("small", "size"),
    adjective("short", "size"),
    adjective("young", "age"),
    determiner("few", "quantifier", "plural"),
  ],
  linja: [
    adjectiveNounPhrase([
      adjective("long", "size"),
      adjective("flexible", "material"),
    ], noun("thing(s)")),
    noun("cord(s)"),
    singularNoun("hair"),
    noun("rope(s)"),
    noun("line(s)"),
    noun("connection(s)"),
    compoundAdjective([
      adjective("long", "size"),
      adjective("flexible", "material"),
    ]),
  ],
  lipu: [
    adjectiveNounPhrase(
      [adjective("flat", "size")],
      noun("object(s)"),
    ),
    noun("book(s)"),
    noun("document(s)"),
    noun("card(s)"),
    noun("paper(s)"),
    noun("record(s)"),
    noun("website(s)"),
    adjective("flat", "size"),
  ],
  loje: [
    singularNoun("red"),
    singularNoun("magenta"),
    singularNoun("scarlet"),
    singularNoun("pink"),
    singularNoun("rust-color"),
    adjectiveNounPhrase(
      [adjective("reddish", "color")],
      singularNoun("orange"),
    ),
    adjective("red", "color"),
    adjective("magenta", "color"),
    adjective("scarlet", "color"),
    adjective("pink", "color"),
    adjective("rust-color", "color"),
    adverbAdjectivePhrase([adverb("reddish")], adjective("orange", "color")),
  ],
  lon: [
    singularNoun("truth"),
    adjective("real", "opinion"),
    adverb("truthfully"),
    verb("exist(ed)", "existing"),
  ],
  luka: [
    noun("hand(s)"),
    noun("arm(s)"),
    adjectiveNounPhrase([adjective("tactile", "qualifier")], noun("organ(s)")),
    adjectiveNounPhrase([adjective("grasping", "qualifier")], noun("organ(s)")),
  ],
  lukin: [
    noun("appearance(s)"),
    noun("visual(s)"),
    noun("eye(s)"),
    adjectiveNounPhrase([adjective("seeing", "qualifier")], noun("organ(s)")),
    verb({
      presentPast: "look(ed)",
      gerund: "looking",
      usePreposition: "at",
    }),
    verb("read", "reading"),
    verb("watch(ed)", "watching"),
  ],
  lupa: [
    noun("hole(s)"),
    singularNoun("pit"),
    noun("cave(s)"),
    noun("doorway(s)"),
    noun("window(s)"),
    noun("portal(s)"),
  ],
  ma: [
    singularNoun("earth"),
    singularNoun("land"),
    singularNoun("world"),
    noun("country/countries"),
    noun("territory/territories"),
    singularNoun("soil"),
  ],
  majuna: [
    adjective("old", "age"),
    adjective("aged", "age"),
    adjective("ancient", "age"),
  ],
  mama: [
    noun("parent(s)"),
    noun("ancestor(s)"),
    noun("creator(s)"),
    noun("originator(s)"),
    noun("caretaker(s)"),
    noun("sustainer(s)"),
    noun("guardian(s)"),
  ],
  mani: [
    singularNoun("money"),
    singularNoun("cash"),
    pluralNoun("savings"),
    singularNoun("wealth"),
    adjectiveNounPhrase([
      adjective("large", "size"),
      adjective("domestic", "qualifier"),
    ], noun("animal(s)")),
  ],
  meli: [
    noun("woman/women"),
    // noun("female(s)"), // this sounds dehumanizing
    adjectiveNounPhrase(
      [adjective("feminine", "qualifier")],
      noun("person/people"),
    ),
    noun("wife/wives"),
  ],
  meso: [
    noun("midpoint(s)"),
    adjective("midpoint", "opinion"),
    adjective("medium", "size"),
    adjective("mediocre", "opinion"),
  ],
  mi: [
    personalPronoun({
      singularSubject: "I",
      singularObject: "me",
      singularPossessive: "my",
      pluralSubject: "we",
      pluralObject: "us",
      pluralPossessive: "our",
    }),
  ],
  mije: [
    noun("man/men"),
    // noun("male(s)"), // this sounds dehumanizing
    adjectiveNounPhrase(
      [adjective("masculine", "qualifier")],
      noun("person/people"),
    ),
    noun("husband(s)"),
  ],
  misikeke: [
    noun("medicine(s)"),
    adjective("medical", "qualifier"),
  ],
  moku: [
    noun("food(s)"),
    noun("drink(s)"),
    verb({
      presentPast: "eat/ate",
      pastParticiple: "eaten",
      gerund: "eating",
    }),
    verb({
      presentPast: "drink/drank",
      pastParticiple: "drinked",
      gerund: "drinking",
    }),
    verb("consume(d)", "consuming"),
    verb("ingest(ed)", "ingesting"),
  ],
  moli: [
    singularNoun("death"),
    adjective("dead", "age"),
    verb("kill(ed)", "killing"),
  ],
  monsi: [
    singularNoun("back"),
    singularNoun("behind"),
    singularNoun("rear"),
  ],
  monsuta: [
    noun("monster(s)"),
    noun("predator(s)"),
    noun("threat(s)"),
    noun("danger(s)"),
    adjective("scary", "opinion"),
  ],
  mu: [], // Special case
  mun: [
    singularNoun("moon"),
    adjectiveNounPhrase(
      [adjective("night sky", "origin")],
      noun("object(s)"),
    ),
    noun("star(s)"),
    adjectiveNounPhrase(
      [adjective("celestial", "origin")],
      noun("body/bodies"),
    ),
  ],
  musi: [
    singularNoun("fun"),
    noun("game(s)"),
    noun("entertainment(s)"),
    noun("art(s)"),
    adjective("fun", "opinion"),
    adjective("amusing", "opinion"),
    adjective("interesting", "opinion"),
    adjective("comical", "opinion"),
    adjective("silly", "opinion"),
    verbObjectPhrase(verb("have/had", "having"), singularNoun("fun")),
  ],
  mute: [
    determiner("many", "quantifier", "plural"),
    determiner("several", "quantifier", "plural"),
    adverb("very"),
  ],
  nanpa: [
    noun("number(s)"),
  ],
  nasa: [
    singularNoun("silliness"),
    singularNoun("strangeness"),
    adjective("unusual", "opinion"),
    adjective("strange", "opinion"),
    adjective("silly", "opinion"),
    adjective("drunk", "opinion"),
    // adjective("intoxicated", "opinion"),
    verb("intoxicate(d)", "intoxicating"),
    adverb("strangely"),
  ],
  nasin: [
    noun("way(s)"),
    noun("custom(s)"),
    noun("doctrine(s)"),
    noun("method(s)"),
    noun("path(s)"),
  ],
  nena: [
    noun("bump(s)"),
    noun("hill(s)"),
    noun("mountain(s)"),
    noun("nose(s)"),
    noun("protuberance(s)"),
  ],
  ni: [
    determiner("this", "demonstrative", "both"),
    determiner("that", "demonstrative", "both"),
    determiner("these", "demonstrative", "both"),
    determiner("those", "demonstrative", "both"),
  ],
  nimi: [
    noun("name(s)"),
    noun("word(s)"),
  ],
  noka: [
    noun("foot/feet"),
    noun("leg(s)"),
    noun("root(s)"),
    adjectiveNounPhrase(
      [adjective("locomotive", "qualifier")],
      noun("organ(s)"),
    ),
  ],
  oko: [], // Will be duplicated with "lukin"
  olin: [
    singularNoun("affection"),
    singularNoun("appreciation"),
    singularNoun("respect"),
    noun("relationship(s)"),
    adjective("platonic", "qualifier"),
    adjective("romantic", "qualifier"),
    adjective("familial", "qualifier"),
    verbObjectPhrase(
      verb({
        presentPast: "have/had",
        gerund: "having",
        usePreposition: "with",
      }),
      adjectiveNounPhrase([
        adjective("strong", "opinion"),
        adjective("emotional", "qualifier"),
      ], singularNoun("bond")),
    ),
    verb("respect(ed)", "respecting"),
  ],
  ona: [
    personalPronoun({
      pluralSubject: "they",
      pluralObject: "them",
      pluralPossessive: "their",
    }),
    personalPronoun({
      singularSubject: "it",
      singularObject: "it",
      singularPossessive: "its",
    }),
  ],
  open: [
    noun("beginning(s)"),
    singularNoun("start"),
    adjective("open", "physical quality"),
    // adjective("turned on", "qualifier"),
    verb("start(ed)", "starting"),
    verb("turn(ed) on", "turning on"),
    verb("open(ed)", "opening"),
  ],
  pakala: [
    singularNoun("mess"),
    noun("damage(s)"),
    // adjective("broken", "opinion"),
    verb("botch(ed)", "botching"),
    verb({
      presentPast: "break/broke",
      pastParticiple: "broken",
      gerund: "breaking",
    }),
    verb("damage(d)", "damaging"),
    verb("harm(ed)", "harming"),
    verb("mess(ed) up", "messing up"),
    interjection("fuck"),
  ],
  pan: [
    noun("grain(s)"),
    adjectiveNounPhrase([adjective("starchy", "material")], noun("food(s)")),
    adjectiveNounPhrase([adjective("baked", "qualifier")], pluralNoun("goods")),
  ],
  pana: [
    verb("give/gave", "giving"),
    verb("send/sent", "sending"),
    verb("emit(ted)", "emitting"),
    verb("provide(d)", "providing"),
    verb("put", "putting"),
    verb("release(d)", "releasing"),
  ],
  pali: [
    verb("build", "building"),
    verb("make/made", "making"),
    verb("prepare(d)", "preparing"),
    intransitiveVerb({
      presentPast: "do/did",
      pastParticiple: "done",
      gerund: "doing",
    }),
    intransitiveVerb("work/worked", "working"),
  ],
  palisa: [
    adjectiveNounPhrase([
      adjective("long", "size"),
      adjective("hard", "material"),
    ], noun("thing(s)")),
    noun("branch(es)"),
    noun("rod(s)"),
    noun("stick(s)"),
  ],
  pilin: [
    noun("heart(s)"),
    noun("feeling(s)"),
    verb("touch(ed)", "touching"),
    verb("feel/felt", "feeling"),
  ],
  pimeja: [
    singularNoun("darkness"),
    adjectiveNounPhrase([adjective("dark", "color")], noun("color(s)")),
    adjective("dark", "color"),
    adjective("unlit", "color"),
    adjective("black", "color"),
    adjective("purple", "color"),
    adjective("brown", "color"),
  ],
  pini: [
    singularNoun("past"),
    adjective("past", "age"),
    verb("end(ed)", "ending"),
  ],
  pipi: [
    noun("insect(s)"),
    noun("bug(s)"),
  ],
  poka: [
    noun("hip(s)"),
    noun("side(s)"),
    noun("vicinity/vicinities"),
    adjective("nearby", "origin"),
  ],
  poki: [
    noun("container(s)"),
  ],
  pona: [
    singularNoun("goodness"),
    singularNoun("simplicity"),
    adjective("good", "opinion"),
    adjective("positive", "opinion"),
    adjective("useful", "opinion"),
    adjective("friendly", "opinion"),
    adjective("peaceful", "opinion"),
    adjective("simple", "opinion"),
    adverb("nicely"),
  ],
  pu: [], // Special case
  sama: [
    noun("similarity/similarities"),
    noun("sibling(s)"),
    noun("peer(s)"),
    noun("fellow(s)"),
    adjective("same", "opinion"),
    adjective("similar", "opinion"),
  ],
  seli: [
    singularNoun("fire"),
    adjectiveNounPhrase(
      [adjective("cooking", "qualifier")],
      noun("element(s)"),
    ),
    adjectiveNounPhrase(
      [adjective("chemical", "qualifier")],
      noun("reaction(s)"),
    ),
    adjectiveNounPhrase(
      [adjective("heat", "qualifier")],
      noun("source(s)"),
    ),
    adjective("hot", "material"),
    verb("heat(ed)", "heating"),
  ],
  selo: [
    adjectiveNounPhrase([adjective("outer", "origin")], noun("form(s)")),
    adjectiveNounPhrase([adjective("outer", "origin")], noun("layer(s)")),
    singularNoun("skin"),
    noun("boundary/boundaries"),
  ],
  seme: [
    determiner("what", "interrogative", "both"),
    determiner("which", "interrogative", "both"),
  ],
  sewi: [
    // TODO: area above, something elevated
    adjectiveNounPhrase([adjective("highest", "origin")], noun("part(s)")),
    verb("elevate(d)", "elevating"),
    adjective("awe-inspiring", "opinion"),
    adjective("divine", "opinion"),
    adjective("sacred", "opinion"),
    adjective("supernatural", "opinion"),
  ],
  sijelo: [
    noun("body/bodies"),
    adjectiveNounPhrase([adjective("physical", "qualifier")], noun("state(s)")),
    singularNoun("torso"),
  ],
  sike: [
    adjectiveNounPhrase(
      [adjective("round", "physical quality")],
      noun("thing(s)"),
    ),
    noun("cycle(s)"),
    adjective("round", "physical quality"),
  ],
  sin: [
    singularNoun("newness"),
    adjective("new", "age"),
    adjective("fresh", "opinion"),
    adjective("additional", "origin"),
    adjective("extra", "origin"),
    adverb("newly"),
  ],
  sina: [
    personalPronoun({
      pluralSubject: "you",
      pluralObject: "you",
      pluralPossessive: "your",
    }),
  ],
  sinpin: [
    noun("face(s)"),
    noun("wall(s)"),
    adjective("foremost", "origin"),
  ],
  sitelen: [
    noun("image(s)"),
    noun("picture(s)"),
    noun("representation(s)"),
    noun("symbol(s)"),
    noun("mark(s)"),
    noun("writing(s)"),
  ],
  soko: [
    noun("fungus/fungi"),
  ],
  sona: [
    singularNoun("knowledge"),
  ],
  soweli: [
    adjectiveNounPhrase(
      [adjective("fuzzy", "physical quality")],
      noun("creature(s)"),
    ),
    adjectiveNounPhrase(
      [adjective("land", "origin")],
      noun("animal(s)"),
    ),
    noun("beast(s)"),
  ],
  su: [], // Special case
  suli: [
    singularNoun("hugeness"),
    singularNoun("importance"),
    adjective("big", "size"),
    adjective("heavy", "size"),
    adjective("important", "opinion"),
    adjective("adult", "age"),
  ],
  suno: [
    singularNoun("sun"),
    noun("light(s)"),
    singularNoun("brightness"),
    singularNoun("glow"),
    noun("radiance(s)"),
    adjectiveNounPhrase([adjective("light", "qualifier")], noun("source(s)")),
    adjective("shining", "color"),
  ],
  supa: [
    adjectiveNounPhrase(
      [adjective("horizontal", "physical quality")],
      noun("surface(s)"),
    ),
  ],
  suwi: [
    singularNoun("sweetness"),
    singularNoun("cuteness"),
    singularNoun("innocence"),
    adjective("sweet", "material"),
    adjective("cute", "opinion"),
    adjective("innocent", "opinion"),
    adverb("sweetly"),
  ],
  tan: [
    noun("origin(s)"),
    noun("cause(s)"),
  ],
  taso: [
    determiner("only", "distributive", "both"), // Question: is this really a distributive determiner?
  ],
  tawa: [
    noun("motion(s)"),
    singularNoun("travel"),
    verb("shake(d)", "shaking"),
    intransitiveVerb("walk(ed)", "walking"),
  ],
  telo: [
    singularNoun("water"),
    singularNoun("liquid"),
    adjectiveNounPhrase([adjective("wet", "material")], noun("substance(s)")),
    noun("beverage(s)"),
    adjective("liquid", "material"),
    adjective("wet", "material"),
  ],
  tenpo: [
    singularNoun("time"),
    singularNoun("duration"),
    noun("moment(s)"),
    noun("occasion(s)"),
    noun("period(s)"),
    noun("situation(s)"),
  ],
  toki: [
    noun("communication(s)"),
    noun("language(s)"),
    verb({
      presentPast: "communicate(d)",
      gerund: "communicating",
      usePreposition: "about",
    }),
    interjection("hello"),
  ],
  tomo: [
    noun("building(s)"),
    singularNoun("home"),
    noun("house(s)"),
    noun("room(s)"),
  ],
  tonsi: [
    adjectiveNounPhrase(
      [adjective("non-binary", "qualifier")],
      noun("person/people"),
    ),
    adjectiveNounPhrase(
      [adjective("gender nonconforming", "qualifier")],
      noun("person/people"),
    ),
    adjectiveNounPhrase(
      [adjective("genderqueer", "qualifier")],
      noun("person/people"),
    ),
    adjectiveNounPhrase(
      [adjective("transgender", "qualifier")],
      noun("person/people"),
    ),
    adjective("non-binary", "qualifier"),
    adjective("gender nonconforming", "qualifier"),
    adjective("genderqueer", "qualifier"),
    adjective("transgender", "qualifier"),
  ],
  tu: [
    verb("separate(d)", "separating"),
    verb("divide(d)", "dividing"),
    verb("split", "splitting"),
    verb("multiply/multiplied", "multiplying"),
    verb("duplicate(d)", "duplicating"),
  ],
  unpa: [
    adjective("sexual", "qualifier"),
    adverb("sexually"),
    verbObjectPhrase(
      verb({
        presentPast: "have/had",
        gerund: "having",
        usePreposition: "with",
      }),
      singularNoun("sex"),
    ),
  ],
  uta: [
    singularNoun("mouth"),
    pluralNoun("lips"),
    adjectiveNounPhrase(
      [adjective("oral", "qualifier")],
      noun("cavity/cavities"),
    ),
    noun("jaw(s)"),
  ],
  utala: [
    noun("battle(s)"),
    noun("challenge(s)"),
    verb({
      presentPast: "compete(d)",
      gerund: "competing",
      usePreposition: "against",
    }),
    verb({
      presentPast: "struggle(d)",
      gerund: "struggling",
      usePreposition: "against",
    }),
  ],
  walo: [
    adjectiveNounPhrase([adjective("light", "color")], noun("color(s)")),
    singularNoun("white"),
    adjectiveNounPhrase([adjective("light", "color")], singularNoun("gray")),
  ],
  wan: [
    adjective("singular", "opinion"),
    verb("combine(d)", "combining"),
    verb("mix(ed)", "mixing"),
    verb("fuse(d)", "fusing"),
  ],
  waso: [
    noun("bird(s)"),
    adjectiveNounPhrase(
      [adjective("flying", "qualifier")],
      noun("creature(s)"),
    ),
    adjectiveNounPhrase(
      [adjective("winged", "qualifier")],
      noun("animal(s)"),
    ),
    intransitiveVerb({
      presentPast: "fly/flew",
      pastParticiple: "flown",
      gerund: "flying",
    }),
  ],
  wawa: [
    singularNoun("power"),
    singularNoun("confidence"),
    singularNoun("energy"),
    singularNoun("intensity"),
    adjective("strong", "opinion"),
    adjective("powerful", "opinion"),
    adjective("confident", "opinion"),
    adjective("energetic", "opinion"),
    adjective("intense", "opinion"),
    adverb("powerfully"),
  ],
  weka: [
    adjective("absent", "origin"),
    adjective("away", "origin"),
    // adjective("ignored", "opinion"),
    verb("ignore(d)", "ignoring"),
    intransitiveVerb("leave", "leaving"),
  ],
  wile: [
    noun("want(s)"),
    noun("need(s)"),
  ],
};
CONTENT_WORD_DEFINITION.ali = CONTENT_WORD_DEFINITION.ale;
CONTENT_WORD_DEFINITION.oko = CONTENT_WORD_DEFINITION.lukin;

import {
  AdjectiveType,
  DeterminerQuantity,
  DeterminerType,
} from "./english-ast.ts";

export type Definition =
  | {
    type: "noun";
    singular: null | string;
    plural: null | string;
    condensed: string;
  }
  | {
    type: "adjective noun phrase";
    adjectives: Array<Definition & { type: "adjective" }>;
    noun: Definition & { type: "noun" };
  }
  | {
    type: "personal pronoun";
    singularSubject: null | string;
    singularObject: null | string;
    singularPossessive: null | string;
    pluralSubject: null | string;
    pluralObject: null | string;
    pluralPossessive: null | string;
  }
  | {
    type: "indefinite pronoun";
    pronoun: string;
  }
  | { type: "adjective"; adjective: string; kind: AdjectiveType }
  | {
    type: "compound adjective";
    adjectives: Array<Definition & { type: "adjective" }>;
  }
  | {
    type: "adverb adjective phrase";
    adverbs: Array<Definition & { type: "adverb" }>;
    adjective: Definition & { type: "adjective" };
  }
  | {
    type: "determiner";
    determiner: string;
    kind: DeterminerType;
    quantity: DeterminerQuantity;
  }
  | { type: "adverb"; adverb: string }
  | {
    type: "verb";
    present: string;
    past: string;
    condensed: string;
    pastParticiple: string;
    gerund: string;
    object: boolean | string;
  }
  | {
    type: "verb object phrase";
    verb: Definition & { type: "verb" };
    object: Definition & { type: "noun" | "adjective noun phrase" };
  }
  | { type: "interjection"; interjection: string };
export const PARTICLE = new Set(Object.keys(PARTICLE_DEFINITION));
export const CONTENT_WORD = new Set(Object.keys(CONTENT_WORD_DEFINITION));
export const PREVERB = new Set(Object.keys(PREVERB_DEFINITION));
export const PREPOSITION = new Set(Object.keys(PREPOSITION_DEFINITION));
export const TOKI_PONA_WORD = new Set([...PARTICLE, ...CONTENT_WORD]);

function noun(word: string): Definition & { type: "noun" } {
  const paren = word.match(/([a-z]*)\(([a-z]*)\)/);
  let singular: string;
  let plural: string;
  if (paren != null) {
    const [_, first, second] = paren;
    singular = first;
    plural = first + second;
  } else if (word.includes("/")) {
    [singular, plural] = word.split("/");
  } else {
    throw new Error(`${word} must either contain parenthesis or slash`);
  }
  return { type: "noun", singular, plural, condensed: word };
}
function singularNoun(word: string): Definition & { type: "noun" } {
  return { type: "noun", singular: word, plural: null, condensed: word };
}
function pluralNoun(word: string): Definition & { type: "noun" } {
  return { type: "noun", singular: null, plural: word, condensed: word };
}
function personalPronoun(option: {
  singularSubject?: undefined | null | string;
  singularObject?: undefined | null | string;
  singularPossessive?: undefined | null | string;
  pluralSubject?: undefined | null | string;
  pluralObject?: undefined | null | string;
  pluralPossessive?: undefined | null | string;
}): Definition & { type: "personal pronoun" } {
  return {
    type: "personal pronoun",
    singularSubject: option.singularSubject ?? null,
    singularObject: option.singularObject ?? null,
    singularPossessive: option.singularPossessive ?? null,
    pluralSubject: option.pluralSubject ?? null,
    pluralObject: option.pluralObject ?? null,
    pluralPossessive: option.pluralPossessive ?? null,
  };
}
function indefinitePronoun(
  pronoun: string,
): Definition & { type: "indefinite pronoun" } {
  return { type: "indefinite pronoun", pronoun };
}
function adjectiveNounPhrase(
  adjectives: Array<Definition & { type: "adjective" }>,
  noun: Definition & { type: "noun" },
): Definition & { type: "adjective noun phrase" } {
  return { type: "adjective noun phrase", adjectives, noun };
}
function adverbAdjectivePhrase(
  adverbs: Array<Definition & { type: "adverb" }>,
  adjective: Definition & { type: "adjective" },
): Definition & { type: "adverb adjective phrase" } {
  return { type: "adverb adjective phrase", adverbs, adjective };
}
function compoundAdjective(
  adjectives: Array<Definition & { type: "adjective" }>,
): Definition & { type: "compound adjective" } {
  return { type: "compound adjective", adjectives };
}
function parseVerb(word: string): {
  past: string;
  present: string;
  condensed: string;
} {
  const paren = word.match(/([a-z]*)\(([a-z]*)\)(| [a-z]*)/);
  let present: string;
  let past: string;
  if (paren != null) {
    const [_, first, second, third] = paren;
    present = first + third;
    past = first + second + third;
  } else {
    const slash = word.match(/([a-z*])\/([a-z]*)(| [a-z]*)/);
    if (slash != null) {
      const [_, first, second, third] = slash;
      present = first + third;
      past = second + third;
    } else {
      present = word;
      past = word;
    }
  }
  return { past, present, condensed: word };
}
type VerbOption = {
  presentPast: string;
  pastParticiple?: null | undefined | string;
  gerund: string;
  usePreposition?: null | undefined | string;
};
function verb(word: string, gerund: string): Definition & { type: "verb" };
function verb(option: VerbOption): Definition & { type: "verb" };
function verb(
  word: string | VerbOption,
  gerund?: string,
): Definition & { type: "verb" } {
  if (typeof word === "string") {
    const { past, present, condensed } = parseVerb(word);
    return {
      type: "verb",
      present,
      past,
      pastParticiple: past,
      condensed,
      gerund: gerund as string,
      object: true,
    };
  } else {
    const { past, present, condensed } = parseVerb(word.presentPast);
    return {
      type: "verb",
      present,
      past,
      pastParticiple: word.pastParticiple ?? past,
      condensed,
      gerund: word.gerund,
      object: word.usePreposition ?? true,
    };
  }
}
function verbObjectPhrase(
  verb: Definition & { type: "verb" },
  object: Definition & { type: "noun" | "adjective noun phrase" },
): Definition & { type: "verb object phrase" } {
  return { type: "verb object phrase", verb, object };
}
type IntransitiveVerbOption = {
  presentPast: string;
  pastParticiple: string;
  gerund: string;
};
function intransitiveVerb(
  word: string,
  gerund: string,
): Definition & { type: "verb" };
function intransitiveVerb(
  option: IntransitiveVerbOption,
): Definition & { type: "verb" };
function intransitiveVerb(
  word: string | IntransitiveVerbOption,
  gerund?: string,
): Definition & { type: "verb" } {
  if (typeof word === "string") {
    const { past, present, condensed } = parseVerb(word);
    return {
      type: "verb",
      present,
      past,
      pastParticiple: past,
      condensed,
      gerund: gerund as string,
      object: false,
    };
  } else {
    const { past, present, condensed } = parseVerb(word.presentPast);
    return {
      type: "verb",
      present,
      past,
      pastParticiple: word.pastParticiple,
      condensed,
      gerund: word.gerund,
      object: false,
    };
  }
}
function adjective(
  word: string,
  kind: AdjectiveType,
): Definition & { type: "adjective" } {
  return { type: "adjective", adjective: word, kind };
}
function determiner(
  determiner: string,
  kind: DeterminerType,
  quantity: DeterminerQuantity,
): Definition & { type: "determiner" } {
  return { type: "determiner", determiner, kind, quantity };
}
function adverb(word: string): Definition & { type: "adverb" } {
  return { type: "adverb", adverb: word };
}
function interjection(word: string): Definition & { type: "interjection" } {
  return { type: "interjection", interjection: word };
}
