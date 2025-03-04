import { assertNotEquals } from "@std/assert/not-equals";
import { parse } from "./parser.ts";

// Examples gathered from https://github.com/kilipan/nasin-toki
// CC-BY-SA 4.0 https://github.com/kilipan/nasin-toki/blob/main/LICENSE.txt
const EXAMPLE_SENTENCES = [
  // "anu seme",
  // "toki [ni] li pona",
  "toki li pona",
  "toki ni li pona",
  "mi lukin e jan ni: ona li tawa tomo",
  "mi lukin e ona",
  "tomo mi li lili",
  "soweli li moku e kili",
  "soweli li pali e tomo",
  "soweli li lukin e kili",
  "tomo waso",
  "mi pali ala",
  "jan ala li lon tomo ni",
  "sina utala ala e waso suli",
  "ilo li tawa e jan ala",
  "soweli suli pimeja",
  "soweli pimeja suli",
  "jan lawa pona",
  "jan pona lawa",
  "tomo ala mute",
  "tomo mute ala",
  "poki pi telo wawa",
  "poki telo wawa",
  "kasi li suli tan wawa suno",
  "mi sama sina",
  "ona li kepeken ilo",
  "mi lon ala tomo",
  "soweli li tawa ala kasi",
  "mi wile ala toki",
  "waso li kama ala suli",
  "waso li musi kepeken wawa kepeken kon",
  "jan li pali li pakala e tomo e ilo lon ma kepeken luka",
  "jan li pali e tomo lon ma li pakala e ilo kepeken luka",
  "jan li pali e tomo e ilo kepeken luka li pakala e ona lon ma",
  "soweli loje li moku ala moku e kili",
  "moku ala",
  "kili li kama ala kama suli",
  "jan li pana ala pana pi wawa mute e sike",
  "soweli ala soweli li nasin e sina",
  "ma sina li lete anu seme",
  "lete. taso suno pini li seli a",
  "jan seme li toki",
  "mi toki.",
  "ona li seme",
  "ona li tawa tomo ona",
  "sina lukin e seme",
  "mi lukin e waso",
  "jan ni li pona tawa mi: ona li mama e kasi",
  "soweli li lukin e waso ni: ona li tawa lon ma kasi",
  "jan li mama e kasi. jan ni li pona tawa mi",
  "jan li mama e kasi. ona li pona tawa mi",
  "waso li tawa lon ma kasi. soweli li lukin e waso ni",
  "waso li tawa lon ma kasi. soweli li lukin e ona",
  "sina jan nanpa wan lon tomo ni",
  "ilo nanpa wan li pona. ilo nanpa tu tu li pona ala",
  "tomo mi la tomo sina li loje mute",
  "nanpa wan",
  "pona la toki ni li nanpa wan",
  "toki ni li pona nanpa wan",
  "mi tomo e waso",
  "mi pona e tomo",
  "mi luka e soweli len",
  "sina telo e sina",
  "pona a",
  "waso suwi",
  "wawa tawa sina",
  "tan seme a",
  "jan pi toki pona",
  "mi o tawa",
  "jan en soweli li sama mute",
  "sina en mi li toki",
  "tenpo mute la kon en telo li wawa",
  "mi pali",
  "pali mi li pona",
  "pali mi",
  "mi taso li lon",
  "tomo",
  "mi taso",
  "sina en mi",
  "soweli li suwi",
  // "mi kama. mi oko. mi anpa",
  "ona li pali mute li lape lili",
  "soweli li pakala e kasi",
  "mi lukin e mun",
  "mi pali lon tomo",
  "mi pali e tomo",
  "ona li tawa tomo",
  "ona li tawa e tomo",
  "waso li mama e waso lili",
  "tenpo lon la mi sitelen e lipu sona",
  "mi la ni li pona",
  "supa tomo li jaki la jan li telo e ona",
  "kepeken ilo telo wawa la mi weka e jaki tan supa",
  "jan lawa mute",
  "jan pi lawa mute",
  "ilo tawa lili mute",
  "ilo pi tawa lili mute",
  "ilo tawa pi lili mute",
  // "[sina] o tawa pona",
  "o tawa pona",
  "sina o tawa pona",
  "ona o lape",
  "mi o toki pona",
  "waso anu kala li tawa",
  "waso li pali anu pakala e tomo",
  "soweli li pali e tomo anu lupa",
  "ike a",
  "o lukin e pali mi a",
  "ni li musi a tawa mi",
  "ni li pona",
  "ona li oko e ni",
  "tomo li suwi. jan li ni kin",
  "soweli li len e kili lon ma. ona li ni tan tenpo lete",
  "ilo pi akesi suwi nanpa wan",
  "ilo nanpa wan pi akesi suwi",
  "nanpa tu li nanpa pona tawa mi",
  "len pi nanpa wan li loje",
  "sitelen tawa nanpa pini li musi a",
  "mi toki lon kalama pana nanpa kama",
  // "kin la",
  // "sama la",
  // "ante la",
  "jan li ken pona kin",
  "kin la ma li sike e suno",
  "ona kin li pali e lipu",
  "ona li pali kin e lipu",
  "ona li pali e lipu kin",
  "mi sona ala pali e tomo",
  "kala li moku kepeken ala ilo",
  "soweli li ken pona taso",
  "taso ma li sike e suno",
  "ona taso li pali e lipu",
  "ona li pali taso e lipu",
  "ona li pali e lipu taso",
  "ona li taso",
  "mi pilin ike ala tan taso mi",
  "mi pana e ijo tawa ona",
  "mi awen lon tomo",
  "mi pali sama ona",
  "mi suli tan moku",
  "mi toki kepeken kalama",
  "mi tawa tomo",
  "mi lon telo",
  "mi sama ona",
  "mi kepeken ilo",
  "mi tawa e soweli",
  "mi lon e kala",
  "mi sama e akesi",
  "mi tan e ona",
  "mi kepeken e ona",
  "mi tawa supa e soweli",
  "mi lon telo e kala",
  "mi sama jan e akesi",
  "mi tan utala e ona",
  "mi kepeken ilo e ona",
  "ona li wile pana e kili",
  "jan lili li wile suli",
  "mi wile tawa lon nasin noka",
  "soweli suli li wile lape lon tenpo lete",
  "mi sona toki pona",
  "waso li sona pali e tomo",
  "o awen pali e ijo",
  "mi awen wile e ni",
  "ona li awen weka",
  "mi kama sona e toki pona",
  "akesi li kama lon nasin telo",
  "tomo li kama suli",
  "sina ken toki tawa mi",
  "jan li ken lape lon ma kasi ni",
  "kala li ken soweli",
  "mi lukin pini e lipu ni",
  "ona li lukin tawa waso",
  "mi oko jo e tomo lili lon ma kasi",
  "ona li open pakala e lupa tomo",
  "ona li open e pakala pi lupa tomo",
  "ona li lukin pakala e lupa tomo",
  "jan li open pona e ma",
  "pona ma la jan li open",
  "jan li kama pona e ma",
  "mi pini tawa tomo sona",
  "mi awen ala tawa tomo sona",
  "mi kama lon tomo sona",
  "soweli li pini jaki e tomo",
  "tomo li kama jaki tan soweli",
  "soweli li jaki e tomo",
  "mi alasa sitelen e lipu pona",
  "jan sona li alasa sona e ijo mute",
];

Deno.test("AST all distinct", () => {
  for (const sentence of EXAMPLE_SENTENCES) {
    const ast = parse(sentence).unwrap();
    for (const [i, a] of ast.entries()) {
      for (const b of ast.slice(i + 1)) {
        assertNotEquals(a, b, `Error at "${sentence}"`);
      }
    }
  }
});
