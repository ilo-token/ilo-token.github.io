export const PARTICLES = new Set([
  "a",
  "ala",
  "anu",
  "e",
  "en",
  "kin",
  "la",
  "li",
  "n",
  "nanpa",
  "o",
  "pi",
  "taso",
]);
export const SPECIAL_CONTENT_WORD = new Set([
  "ala",
  "jasima",
  "kijetesantakalu",
  "kokosila",
  "ku",
  "lili",
  "mu",
  "ni",
  "pu",
  "seme",
  "su",
]);
export const PRONOUN_DEFINITION: { [word: string]: Pronoun } = {
  mi: {
    singularSubject: "I",
    singularObject: "me",
    singularPossessive: "my",
    pluralSubject: "we",
    pluralObject: "us",
    pluralPossessive: "our",
  },
  sina: {
    singularSubject: null,
    singularObject: null,
    singularPossessive: null,
    pluralSubject: "you",
    pluralObject: "you",
    pluralPossessive: "your",
  },
  ona: {
    singularSubject: null,
    singularObject: null,
    singularPossessive: null,
    pluralSubject: "they",
    pluralObject: "them",
    pluralPossessive: "their",
  },
};
export const PREPOSITION_DEFINITION: { [word: string]: Array<string> } = {
  kepeken: ["using"],
  lon: ["at"],
  sama: ["similar to"],
  tan: ["from", "because of"],
  tawa: ["towards", "in perspective of"],
};
export const PREVERB_DEFINITION: { [word: string]: Array<never> } = {
  alasa: [],
  awen: [],
  kama: [],
  ken: [],
  lukin: [],
  open: [],
  pini: [],
  sona: [],
  wile: [],
};
export const CONTENT_WORD_DEFINITION: { [word: string]: Array<Definition> } = {
  akesi: [
    noun("reptile(s)"),
    noun("amphibian(s)"),
    adjective("reptilian", "qualifier"),
    adjective("amphibian", "qualifier"),
  ],
  ala: [
    numeral(0),
  ],
  alasa: [
    verb("hunt(ed)", "hunting"),
    verb("search(ed)", "searching"),
  ],
  ale: [
    numeral(100),
    singularNoun("everything"),
    singularNoun("anything"),
    singularNoun("entirety"),
    quantifier("all"),
    quantifier("every"),
    adverb("completely"),
  ],
  ali: [], // Will be duplicated with "ale"
  anpa: [
    singularNoun("bottom"),
    singularNoun("below"),
    singularNoun("floor"),
    // TODO: adjectives
  ],
  ante: [
    noun("change(s)"),
    noun("difference(s)"),
    noun("modification(s)"),
    adjective("different", "opinion"),
    adjective("other", "opinion"),
    adjective("altered", "opinion"),
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
    singularNoun("centre"),
    noun("content(s)"),
    singularNoun("inside"),
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
    singularNoun("somebody"), // This is technically a pronoun
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
    verb("have/had", "having"),
    verb("carry/carried", "carrying"),
    verb("contain(ed)", "containing"),
    verb("hold/held", "holding"),
  ],
  kala: [
    noun("fish(es)"),
    adjectiveNounPhrase([adjective("sea", "qualifier")], noun("creature(s)")),
    intransitiveVerb("swim", "swimming"),
  ],
  kalama: [
    noun("sound(s)"),
    intransitiveVerb("sound(ed)", "sounding"),
  ],
  kama: [
    singularNoun("future"),
    adjective("future", "age"),
    verb("summon(ed)", "summoning"),
    intransitiveVerb("arrive", "arriving"),
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
  kepeken: [],
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
      [adjective("hard", "physical quality")],
      noun("object(s)"),
    ),
    noun("metal(s)"),
    noun("rock(s)"),
    noun("stone(s)"),
    adjective("hard", "physical quality"),
  ],
  ko: [
    singularNoun("semi-solid"),
    singularNoun("paste"),
    singularNoun("powder"),
    singularNoun("goo"),
    singularNoun("sand"),
    singularNoun("soil"),
    singularNoun("clay"),
    adjective("squishy", "physical quality"),
    adjective("moldable", "physical quality"),
  ],
  kon: [
    singularNoun("air"),
    singularNoun("breath"),
    singularNoun("essence"),
    singularNoun("spirit"),
    adjectiveNounPhrase(
      [adjective("hidden", "physical quality")],
      singularNoun("reality"),
    ),
    adjectiveNounPhrase(
      [adjective("unseen", "physical quality")],
      singularNoun("agent"),
    ),
  ],
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
    verb("listen(ed)", "listening", "at"),
  ],
  lanpan: [
    verb("take/took", "taking"),
    verb("seize(d)", "seizing"),
    verb("catch(ed)", "catching"),
    verb("receive(d)", "receiving"),
    verb("get/got", "getting"),
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
    adjective("hidden", "origin"),
    verb("cover(ed)", "covering"),
  ],
  lete: [
    singularNoun("coldness"),
    adjective("cool", "physical quality"),
    adjective("cold", "physical quality"),
    adjective("frozen", "physical quality"),
    verb("freeze/froze", "freezing"),
  ],
  lili: [
    singularNoun("smallness"),
    adjective("small", "physical quality"),
    adjective("short", "physical quality"),
    adjective("young", "age"),
    quantifier("few"),
  ],
  linja: [
    adjectiveNounPhrase([
      adjective("long", "physical quality"),
      adjective("flexible", "physical quality"),
    ], noun("thing(s)")),
    noun("cord(s)"),
    singularNoun("hair"),
    noun("rope(s)"),
    noun("line(s)"),
    noun("connection(s)"),
    compoundAdjective([
      adjective("long", "physical quality"),
      adjective("flexible", "physical quality"),
    ]),
  ],
  lipu: [
    adjectiveNounPhrase(
      [adjective("flat", "physical quality")],
      noun("object(s)"),
    ),
    noun("book(s)"),
    noun("document(s)"),
    noun("card(s)"),
    noun("paper(s)"),
    noun("record(s)"),
    noun("website(s)"),
    adjective("flat", "physical quality"),
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
    verb("exist", "existing"),
  ],
  luka: [
    numeral(5),
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
    verb("look(ed)", "looking", "at"),
    verb("read", "reading"),
    verb("watch(ed)", "watchingF"),
  ],
  lupa: [
    noun("hole(s)"),
    singularNoun("pit"),
    noun("cave(s)"),
    singularNoun("doorway"),
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
    verb("eat/ate", "eating"),
    verb("drink/drank", "drinking"),
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
    numeral(20),
    quantifier("many"),
    quantifier("several"),
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
    adjective("intoxicated", "opinion"),
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
    verb("respect(ed)", "respecting"),
    // TODO: to have a strong emotional bond (with)
  ],
  open: [
    noun("beginning(s)"),
    singularNoun("start"),
    adjective("open", "physical quality"),
    adjective("turned on", "qualifier"),
    verb("start(ed)", "starting"),
    verb("turn(ed) on", "turning on"),
  ],
  pakala: [
    singularNoun("mess"),
    noun("damage(s)"),
    adjective("botched", "opinion"),
    adjective("broken", "opinion"),
    verb("botch(ed)", "botching"),
    verb("break/broke", "breaking"),
    verb("damage(d)", "damaging"),
    verb("harm(ed)", "harming"),
    verb("mess(ed) up", "messing up"),
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
    intransitiveVerb("do/did", "doing"),
    intransitiveVerb("work/worked", "working"),
  ],
  palisa: [
    adjectiveNounPhrase([
      adjective("long", "physical quality"),
      adjective("hard", "physical quality"),
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
  sewi: [
    // TODO: area above, something elevated
    adjectiveNounPhrase([adjective("highest", "origin")], noun("part(s)")),
    verb("elevate(d)", "elavating"),
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
    quantifier("another"), // It is a determiner. But is it a quantifier?
    adverb("newly"),
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
    singularNoun("radiance"),
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
    quantifier("only"),
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
    singularNoun("moment"),
    noun("occasion(s)"),
    noun("period(s)"),
    noun("situation(s)"),
  ],
  toki: [
    noun("communication(s)"),
    noun("language(s)"),
    verb("communicate(d)", "communicating", "about"),
    // TODO: hello interjection
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
    numeral(2),
    verb("separate(d)", "separating"),
    verb("divide(d)", "dividing"),
    verb("split", "splitting"),
    verb("multiply/multiplied", "multiplying"),
    verb("duplicate(d)", "duplicating"),
  ],
  unpa: [
    adjective("sexual", "qualifier"),
    adverb("sexually"),
    verbObjectPhrase(verb("have/had", "having", "with"), singularNoun("sex")),
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
    verb("compete(d)", "against"),
    verb("struggle(d)", "against"),
  ],
  walo: [
    adjectiveNounPhrase([adjective("light", "color")], noun("color(s)")),
    singularNoun("white"),
    adjectiveNounPhrase([adjective("light", "color")], singularNoun("gray")),
  ],
  wan: [
    numeral(1),
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
    intransitiveVerb("fly", "flying"),
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
    adverb("powefully"),
  ],
  weka: [
    adjective("absent", "origin"),
    adjective("away", "origin"),
    adjective("ignored", "opinion"),
    intransitiveVerb("leave", "leaving"),
  ],
  wile: [
    noun("want(s)"),
    noun("need(s)"),
  ],
};
CONTENT_WORD_DEFINITION.ali = CONTENT_WORD_DEFINITION.ale;
CONTENT_WORD_DEFINITION.oko = CONTENT_WORD_DEFINITION.lukin;

export type AdjectiveType =
  | "opinion"
  | "size"
  | "physical quality"
  | "age"
  | "color"
  | "origin"
  | "material"
  | "qualifier";
export type Pronoun = {
  singularSubject: null | string;
  singularObject: null | string;
  singularPossessive: null | string;
  pluralSubject: string;
  pluralObject: string;
  pluralPossessive: string;
};
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
    type: "adjective";
    adjective: string;
    kind: AdjectiveType;
  }
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
    type: "quantifier";
    quantifier: string;
  }
  | {
    type: "numeral";
    number: number;
  }
  | {
    type: "adverb";
    adverb: string;
  }
  | {
    type: "verb";
    past: string;
    present: string;
    condensed: string;
    gerund: string;
    object: boolean | string;
  }
  | {
    type: "verb object phrase";
    verb: Definition & { type: "verb" };
    object: Definition & { type: "noun" };
  }
  | {
    type: "gerund";
    gerund: string;
  };
export const CONTENT_WORD = new Set([
  ...SPECIAL_CONTENT_WORD,
  ...Object.keys(PRONOUN_DEFINITION),
  ...Object.keys(CONTENT_WORD_DEFINITION),
]);
export const PREVERB = new Set(Object.keys(PREVERB_DEFINITION));
export const PREPOSITION = new Set(Object.keys(PREPOSITION_DEFINITION));

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
  return {
    type: "noun",
    singular,
    plural,
    condensed: word,
  };
}
function singularNoun(word: string): Definition & { type: "noun" } {
  return {
    type: "noun",
    singular: word,
    plural: null,
    condensed: word,
  };
}
function pluralNoun(word: string): Definition & { type: "noun" } {
  return {
    type: "noun",
    singular: null,
    plural: word,
    condensed: word,
  };
}
function adjectiveNounPhrase(
  adjectives: Array<Definition & { type: "adjective" }>,
  noun: Definition & { type: "noun" },
): Definition & { type: "adjective noun phrase" } {
  return {
    type: "adjective noun phrase",
    adjectives,
    noun,
  };
}
function adverbAdjectivePhrase(
  adverbs: Array<Definition & { type: "adverb" }>,
  adjective: Definition & { type: "adjective" },
): Definition & { type: "adverb adjective phrase" } {
  return {
    type: "adverb adjective phrase",
    adverbs,
    adjective,
  };
}
function compoundAdjective(
  adjectives: Array<Definition & { type: "adjective" }>,
): Definition & { type: "compound adjective" } {
  return {
    type: "compound adjective",
    adjectives,
  };
}
function parseVerb(
  word: string,
): { past: string; present: string; condensed: string } {
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
function verb(
  word: string,
  gerund: string,
  usePreposition?: null | undefined | string,
): Definition & { type: "verb" } {
  const { past, present, condensed } = parseVerb(word);
  return {
    type: "verb",
    present,
    past,
    condensed,
    gerund,
    object: usePreposition ?? true,
  };
}
function verbObjectPhrase(
  verb: Definition & { type: "verb" },
  object: Definition & { type: "noun" },
): Definition & { type: "verb object phrase" } {
  return {
    type: "verb object phrase",
    verb,
    object,
  };
}
function intransitiveVerb(
  word: string,
  gerund: string,
): Definition & { type: "verb" } {
  const { past, present, condensed } = parseVerb(word);
  return {
    type: "verb",
    present,
    past,
    condensed,
    gerund,
    object: false,
  };
}
function adjective(
  word: string,
  kind: AdjectiveType,
): Definition & { type: "adjective" } {
  return {
    type: "adjective",
    adjective: word,
    kind,
  };
}
function numeral(number: number): Definition & { type: "numeral" } {
  return {
    type: "numeral",
    number,
  };
}
function adverb(word: string): Definition & { type: "adverb" } {
  return {
    type: "adverb",
    adverb: word,
  };
}
function quantifier(word: string): Definition & { type: "quantifier" } {
  return {
    type: "quantifier",
    quantifier: word,
  };
}
