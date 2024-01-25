/** Represents possible translations of words. */
export type Translation = {
  noun: Array<string>;
  adjective: Array<string>;
  adverb: Array<string>;
};
/** Record of word translations. */
export const DEFINITION: { [key: string]: Translation } = {
  // All Linku definitions are gathered from:
  // https://github.com/lipu-linku/sona/blob/main/words/translations/eng/definitions.toml
  // Last commit used: 69ecccb

  // akesi
  // Linku: reptile, amphibian
  akesi: {
    noun: ["reptile", "reptiles", "amphibian", "amphibians"],
    adjective: ["reptilian", "amphibian"],
    adverb: [],
  },
  // ala
  // Linku: no, not, zero; [~ ala ~] (used to form a yes-no question); nothing
  ala: {
    noun: ["nothing", "no"],
    adjective: ["not", "no"],
    adverb: ["not"],
  },
  // alasa
  // Linku: hunt, search, forage, attempt; (preverb) try to
  alasa: { noun: ["searching"], adjective: [], adverb: [] },
  // ale/ali
  // Linku: all, every, everything, entirety; any, anything; (number) one hundred
  ale: {
    noun: ["everything"],
    adjective: ["all"],
    adverb: ["completely"],
  },
  ali: {
    noun: ["everything"],
    adjective: ["all"],
    adverb: ["completely"],
  },
  // anpa
  // Linku: bowing down, downward, humble, lowly, dependent | ALT bottom, lower part, under, below, floor, beneath; low, lower, bottom, down
  anpa: {
    noun: ["bottom", "bottoms", "under"],
    adjective: ["bottom"],
    adverb: [],
  },
  // ante
  // Linku: change, difference, modification; other, altered; to modify
  ante: {
    noun: ["changing"],
    adjective: ["different", "other"],
    adverb: ["differently"],
  },
  // awen
  // Linku: enduring, kept, protected, safe, waiting, staying; (pv.) to continue to, to keep
  awen: { noun: ["staying"], adjective: ["staying"], adverb: [] },
  // esun
  // Linku: trade, barter, exchange, swap, buy, sell; market, shop, fair, bazaar, place of business
  esun: { noun: ["shop", "shops"], adjective: [], adverb: [] },
  // ijo
  // Linku: thing, phenomenon, object, matter
  ijo: { noun: ["thing", "things"], adjective: [], adverb: [] },
  // ike
  // Linku: negative quality, e.g. bad, unpleasant, harmful, unneeded
  ike: { noun: ["badness"], adjective: ["bad"], adverb: ["badly"] },
  // ilo
  // Linku: tool, implement, machine, device
  ilo: { noun: ["tool", "tools"], adjective: [], adverb: [] },
  // insa
  // Linku: centre, content, inside, between; internal organ, stomach
  insa: { noun: ["inside", "insides"], adjective: [], adverb: [] },
  // jaki
  // Linku: disgusting, obscene, sickly, toxic, unclean, unsanitary
  jaki: {
    noun: ["obscenity", "obscenities"],
    adjective: ["gross"],
    adverb: ["disgustingly"],
  },
  // jan
  // Linku: human being, person, somebody
  jan: {
    noun: ["person", "people", "human", "humans", "humanity"],
    adjective: ["person-like"],
    adverb: [],
  },
  // jelo
  // Linku: yellow, amber, golden, lime yellow, yellowish orange
  jelo: { noun: ["yellowness"], adjective: ["yellow"], adverb: [] },
  // jo
  // Linku: to have, carry, contain, hold
  jo: {
    noun: ["possession", "possessions"],
    adjective: [],
    adverb: [],
  },
  // kala
  // Linku: fish, marine animal, sea creature
  kala: {
    noun: ["fish", "fishes"],
    adjective: ["fish-like"],
    adverb: [],
  },
  // kalama
  // Linku: to produce a sound; recite, utter aloud
  kalama: {
    noun: ["sound", "sounds"],
    adjective: ["sounding"],
    adverb: [],
  },
  // kama
  // Linku: arriving, coming, future, summoned; (pv.) to become, manage to, succeed in
  kama: { noun: ["arriving"], adjective: ["arriving"], adverb: [] },
  // kasi
  // Linku: plant, vegetation; herb, leaf
  kasi: {
    noun: ["plant", "plants"],
    adjective: ["plant-like"],
    adverb: [],
  },
  // ken
  // Linku: to be able to, be allowed to, can, may; possible
  ken: {
    noun: ["ability", "abilities", "possibility", "possibilities"],
    adjective: [],
    adverb: [],
  },
  // kili
  // Linku: fruit, vegetable, mushroom
  kili: {
    noun: ["fruit", "fruits", "vegetable", "vegetables"],
    adjective: [],
    adverb: [],
  },
  // kiwen
  // Linku: hard object, metal, rock, stone
  kiwen: {
    noun: ["hard thing", "hard things"],
    adjective: ["hard"],
    adverb: [],
  },
  // ko
  // Linku: semi-solid, e.g. paste, powder, goo, sand, soil, clay; squishy, moldable
  ko: {
    noun: ["soft thing", "soft things", "powder"],
    adjective: ["soft"],
    adverb: [],
  },
  // kon
  // Linku: air, breath; essence, spirit; hidden reality, unseen agent
  kon: { noun: ["air", "essence"], adjective: [], adverb: [] },
  // kule
  // Linku: color, pigment; category, genre, flavor; relating to queerness, relating to the LGBT+ community
  kule: {
    noun: ["color", "colors"],
    adjective: ["colorful"],
    adverb: ["colorfully"],
  },
  // kulupu
  // Linku: community, company, group, nation, society, tribe
  kulupu: { noun: ["group", "groups"], adjective: [], adverb: [] },
  // kute
  // Linku: ear; to hear, listen; pay attention to, obey
  kute: {
    noun: ["ear", "ears", "listening"],
    adjective: [],
    adverb: [],
  },
  // lape
  // Linku: sleep, rest, break from an activity or work
  lape: {
    noun: ["sleep", "rest"],
    adjective: ["sleeping"],
    adverb: [],
  },
  // laso
  // Linku: turquoise, blue, green, cyan, indigo, lime green
  laso: {
    noun: ["blueness", "greenness"],
    adjective: ["blue", "green"],
    adverb: [],
  },
  // lawa
  // Linku: head, mind; to control, direct, guide, lead, own, plan, regulate, rule
  lawa: {
    noun: ["head", "heads", "control", "controls"],
    adjective: ["controlling"],
    adverb: [],
  },
  // len
  // Linku: cloth, clothing, fabric, textile; cover, layer of privacy
  len: {
    noun: ["cloth", "clothes", "hiding"],
    adjective: ["hidden"],
    adverb: [],
  },
  // lete
  // Linku: cool, cold, frozen; freeze
  lete: {
    noun: ["coldness"],
    adjective: ["cold", "uncooked"],
    adverb: [],
  },
  // lili
  // Linku: small, short, young; few; piece of
  lili: {
    noun: ["smallness"],
    adjective: ["small"],
    adverb: ["slightly"],
  },
  // linja
  // Linku: long and flexible thing; cord, hair, rope, thread, yarn | ALT line, connection
  linja: {
    noun: ["long flexible thing", "long flexible things"],
    adjective: ["long flexible"],
    adverb: [],
  },
  // lipu
  // Linku: flat object; book, document, card, paper, record, website
  lipu: {
    noun: ["book", "books", "paper", "paper-like thing", "paper-like things"],
    adjective: ["paper-like"],
    adverb: [],
  },
  // loje
  // Linku: red, magenta, scarlet, pink, rust-colored, reddish orange
  loje: { noun: ["redness"], adjective: ["red"], adverb: [] },
  // lon
  // Linku: located at, present at, real, true, existing
  lon: {
    noun: ["truth", "true"],
    adjective: ["truthful"],
    adverb: ["truthfully"],
  },
  // luka
  // Linku: hand, arm, tactile organ, grasping organ; (number) five
  luka: {
    noun: ["hand", "hands", "arm", "arms"],
    adjective: [],
    adverb: [],
  },
  // lukin
  // Linku: look, view, examine, read, watch; appearance, visual; eye, seeing organ; (preverb) try to
  lukin: { noun: ["eye", "eyes", "sight"], adjective: [], adverb: [] },
  // lupa
  // Linku: hole, pit, cave, doorway, window, portal
  lupa: { noun: ["hole", "holes"], adjective: [], adverb: [] },
  // ma
  // Linku: earth, land; outdoors, world; country, territory; soil
  ma: {
    noun: ["place", "places", "earth"],
    adjective: ["earthy"],
    adverb: [],
  },
  // mama
  // Linku: parent, ancestor; creator, originator; caretaker, sustainer, guardian
  mama: {
    noun: ["parent", "parents", "creator", "creators"],
    adjective: [],
    adverb: [],
  },
  // mani
  // Linku: money, cash, savings, wealth; large domesticated animal
  mani: {
    noun: ["money", "large domestic animal", "large domestic animals"],
    adjective: [],
    adverb: [],
  },
  // meli
  // Linku: woman, female, feminine person; wife
  meli: {
    noun: ["woman", "women", "feminity"],
    adjective: ["woman", "feminine"],
    adverb: [],
  },
  // mi
  // Linku: I, me, we, us
  mi: {
    noun: ["I", "me", "we", "us"],
    adjective: ["my", "our"],
    adverb: [],
  },
  // mije
  // Linku: man, male, masculine person; husband
  mije: {
    noun: ["man", "men", "masculinity"],
    adjective: ["man", "masculine"],
    adverb: [],
  },
  // moku
  // Linku: to eat, drink, consume, swallow, ingest
  moku: {
    noun: ["food", "foods", "drink", "drinks"],
    adjective: [],
    adverb: [],
  },
  // moli
  // Linku: dead, dying
  moli: { noun: ["death"], adjective: ["dead", "deadly"], adverb: [] },
  // monsi
  // Linku: back, behind, rear
  monsi: { noun: ["back"], adjective: [], adverb: [] },
  // mu
  // Linku: (animal noise or communication) | ALT (non-speech vocalization)
  mu: { noun: ["moo"], adjective: ["mooing"], adverb: [] },
  // mun
  // Linku: moon, night sky object, star, celestial body
  mun: {
    noun: ["celestial object", "celestial objects", "glowing thing"],
    adjective: ["glowing"],
    adverb: [],
  },
  // musi
  // Linku: fun, game, entertainment, art, play, amusing, interesting, comical, silly
  musi: {
    noun: ["entertainment", "entertainments"],
    adjective: ["entertaining"],
    adverb: ["entertainingly"],
  },
  // mute
  // Linku: many, several, very; quantity; (number) twenty
  mute: { noun: ["many"], adjective: ["many"], adverb: ["very"] },
  // nanpa
  // Linku: -th (ordinal number); numbers
  nanpa: {
    noun: ["number", "numbers"],
    adjective: ["numeric"],
    adverb: ["numerically"],
  },
  // nasa
  // Linku: unusual, strange; silly; drunk, intoxicated
  nasa: {
    noun: ["silliness", "strangeness"],
    adjective: ["silly", "strange"],
    adverb: ["strangely"],
  },
  // nasin
  // Linku: way, custom, doctrine, method, path, road
  nasin: { noun: ["way"], adjective: [], adverb: [] },
  // nena
  // Linku: bump, button, hill, mountain, nose, protuberance
  nena: { noun: ["bump"], adjective: [], adverb: [] },
  // ni
  // Linku: that, this
  ni: {
    noun: ["this", "that"],
    adjective: ["this", "that"],
    adverb: [],
  },
  // nimi
  // Linku: name, word
  nimi: {
    noun: ["name", "names", "word", "words"],
    adjective: [],
    adverb: [],
  },
  // noka
  // Linku: foot, leg, organ of locomotion, roots
  noka: {
    noun: ["foot", "feet", "leg", "legs"],
    adjective: [],
    adverb: [],
  },
  // olin
  // Linku: to have a strong emotional bond (with), e.g. affection, appreciation, (respect), platonic, romantic or familial relationships
  olin: { noun: ["love"], adjective: [], adverb: [] },
  // ona
  // Linku: he, she, it, they
  ona: {
    noun: ["they", "them", "it"],
    adjective: ["their", "its"],
    adverb: [],
  },
  // open
  // Linku: begin, start; open; turn on
  open: {
    noun: ["beginning", "beginnings"],
    adjective: [],
    adverb: [],
  },
  // pakala
  // Linku: botched, broken, damaged, harmed, messed up | ALT (curse expletive, e.g. fuck!)
  pakala: {
    noun: ["mistake", "mistakes"],
    adjective: ["broken"],
    adverb: [],
  },
  // pan
  // Linku: grains, starchy foods, baked goods; e.g. rice, sorghum, bread, noodles, masa, porridge, injera
  pan: { noun: ["grain", "grains"], adjective: [], adverb: [] },
  // pana
  // Linku: give, send, emit, provide, put, release
  pana: { noun: ["giving"], adjective: [], adverb: [] },
  // pali
  // Linku: do, take action on, work on; build, make, prepare
  pali: { noun: ["work"], adjective: ["working"], adverb: [] },
  // palisa
  // Linku: long hard thing; branch, rod, stick
  palisa: {
    noun: ["long hard thing", "long hard things"],
    adjective: ["long hard"],
    adverb: [],
  },
  // pilin
  // Linku: heart (physical or emotional); feeling (an emotion, a direct experience)
  pilin: { noun: ["emotion", "emotions"], adjective: [], adverb: [] },
  // pimeja
  // Linku: dark, unlit; dark color, e.g. black, purple, brown
  pimeja: {
    noun: ["blackness", "brownness", "grayness"],
    adjective: ["black", "brown", "gray"],
    adverb: [],
  },
  // pini
  // Linku: ago, completed, ended, finished, past
  pini: { noun: ["end", "ends"], adjective: ["ended"], adverb: [] },
  // pipi
  // Linku: bug, insect, ant, spider
  pipi: {
    noun: ["insect", "insects", "bug", "bugs"],
    adjective: ["bug-like", "insect-like"],
    adverb: [],
  },
  // poka
  // Linku: hip, side; next to, nearby, vicinity | ALT along with (comitative), beside
  poka: { noun: ["side", "sides", "hips"], adjective: [], adverb: [] },
  // poki
  // Linku: container, bag, bowl, box, cup, cupboard, drawer, vessel
  poki: { noun: ["container"], adjective: [], adverb: [] },
  // pona
  // Linku: good, positive, useful; friendly, peaceful; simple
  pona: {
    noun: ["goodness", "simplicity"],
    adjective: ["good", "simple"],
    adverb: ["nicely"],
  },
  // pu
  // Linku: to interact with the book Toki Pona: The Language of Good (2014) by Sonja Lang
  pu: {
    noun: [],
    adjective: [],
    adverb: [],
  },
  // sama
  // Linku: same, similar; each other; sibling, peer, fellow; as, like
  sama: { noun: ["similarity"], adjective: [], adverb: ["equally"] },
  // seli
  // Linku: fire; cooking element, chemical reaction, heat source
  seli: {
    noun: ["fire", "heat", "chemical reaction", "chemical reactions"],
    adjective: ["hot"],
    adverb: [],
  },
  // selo
  // Linku: outer form, outer layer; bark, peel, shell, skin; boundary
  selo: {
    noun: ["outer form", "skin", "boundary", "boundaries"],
    adjective: [],
    adverb: [],
  },
  // seme
  // Linku: what? which?
  seme: {
    noun: ["what", "which"],
    adjective: ["what", "which"],
    adverb: [],
  },
  // sewi
  // Linku: area above, highest part, something elevated; awe-inspiring, divine, sacred, supernatural
  sewi: {
    noun: ["above", "divinity"],
    adjective: ["divine"],
    adverb: ["divinely"],
  },
  // sijelo
  // Linku: body (of person or animal), physical state, torso
  sijelo: { noun: ["body", "bodies"], adjective: [], adverb: [] },
  // sike
  // Linku: round or circular thing; ball, circle, cycle, sphere, wheel; of one year
  sike: {
    noun: ["round thing", "round things", "cycle"],
    adjective: ["round"],
    adverb: ["repeatedly"],
  },
  // sin
  // Linku: new, fresh; additional, another, extra
  sin: {
    noun: ["new thing", "new things"],
    adjective: ["new"],
    adverb: ["newly"],
  },
  // sina
  // Linku: you
  sina: { noun: ["you", "you all"], adjective: ["your"], adverb: [] },
  // sinpin
  // Linku: face, foremost, front, wall
  sinpin: {
    noun: ["face", "faces", "wall", "walls"],
    adjective: [],
    adverb: [],
  },
  // sitelen
  // Linku: image, picture, representation, symbol, mark, writing
  sitelen: {
    noun: ["writing", "writings", "image", "images"],
    adjective: [],
    adverb: [],
  },
  // sona
  // Linku: know, be skilled in, be wise about, have information on; (pv.) know how to
  sona: {
    noun: ["knowledge"],
    adjective: ["knowledgeable"],
    adverb: [],
  },
  // soweli
  // Linku: fuzzy creature, land animal, beast
  soweli: {
    noun: ["animal", "animals"],
    adjective: ["animal-like"],
    adverb: [],
  },
  // suli
  // Linku: big, heavy, large, long, tall; important; adult
  suli: {
    noun: ["hugeness", "importance"],
    adjective: ["huge", "important"],
    adverb: ["hugely", "importantly"],
  },
  // suno
  // Linku: sun; light, brightness, glow, radiance, shine; light source
  suno: {
    noun: ["light source", "light sources", "sun"],
    adjective: ["shining"],
    adverb: [],
  },
  // supa
  // Linku: horizontal surface, thing to put or rest something on
  supa: {
    noun: ["horizontal surface", "horizontal surfaces"],
    adjective: [],
    adverb: [],
  },
  // suwi
  // Linku: sweet, fragrant; cute, innocent, adorable
  suwi: {
    noun: ["sweetness", "cuteness", "innocence"],
    adjective: ["sweet", "cute", "innocent"],
    adverb: ["sweetly"],
  },
  // tan
  // Linku: by, from, because of; origin, cause
  tan: { noun: ["reason", "origin"], adjective: [], adverb: [] },
  // tawa
  // Linku: motion, e.g. walking, shaking, flight, travel; (preposition) to, for, going to, from the perspective of
  tawa: { noun: ["movement"], adjective: ["moving"], adverb: [] },
  // telo
  // Linku: water, liquid, fluid, wet substance; beverages
  telo: { noun: ["liquid"], adjective: ["liquid"], adverb: [] },
  // tenpo
  // Linku: time, duration, moment, occasion, period, situation
  tenpo: { noun: ["time"], adjective: [], adverb: [] },
  // toki
  // Linku: communicate, say, speak, talk, use language, think; hello
  toki: {
    noun: [
      "communication",
      "communications",
      "language",
      "languages",
      "hello",
    ],
    adjective: ["communicating"],
    adverb: [],
  },
  // tomo
  // Linku: indoor space; building, home, house, room
  tomo: { noun: ["house", "houses"], adjective: [], adverb: [] },
  // tonsi
  // Linku: nonbinary, gender nonconforming, genderqueer, transgender*
  tonsi: {
    noun: [
      "transgender person",
      "transgender people",
      "non-binary person",
      "non-binary people",
    ],
    adjective: ["transgender", "non-binary"],
    adverb: [],
  },
  // tu
  // Linku: (number) two; separate, divide, split; multiply, duplicate
  tu: { noun: ["pair"], adjective: ["two"], adverb: [] },
  // unpa
  // Linku: have sexual relations with
  unpa: { noun: ["sex"], adjective: ["sexual"], adverb: ["sexually"] },
  // uta
  // Linku: mouth, lips, oral cavity, jaw
  uta: { noun: ["mouth"], adjective: [], adverb: [] },
  // utala
  // Linku: battle, challenge, compete against, struggle against
  utala: {
    noun: ["conflict", "difficulty"],
    adjective: ["conflicting", "difficult"],
    adverb: ["conflictingly", "difficultly"],
  },
  // walo
  // Linku: light-colored, white, pale, light gray, cream
  walo: {
    noun: ["whiteness", "paleness"],
    adjective: ["white", "pale"],
    adverb: [],
  },
  // wan
  // Linku: (number) one; singular; combine, join, mix, fuse
  wan: { noun: ["one"], adjective: ["one"], adverb: [] },
  // waso
  // Linku: bird, flying creature, winged animal
  waso: {
    noun: ["bird", "birds"],
    adjective: ["bird-like"],
    adverb: [],
  },
  // wawa
  // Linku: strong, powerful; confident, sure; energetic, intense
  wawa: {
    noun: ["power", "powers"],
    adjective: ["powerful"],
    adverb: ["powerfully"],
  },
  // weka
  // Linku: absent, away, ignored
  weka: { noun: ["leaving"], adjective: ["leaving"], adverb: [] },
  // wile
  // Linku:want, desire, wish, require; (preverb) want to
  wile: {
    noun: ["want", "wants", "need", "needs"],
    adjective: [],
    adverb: [],
  },
};
