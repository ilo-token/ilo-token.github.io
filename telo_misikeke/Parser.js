// this code is from https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/-/raw/main/public/Parser.js
//
// repository: https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/
// Copyright (c) 2023 Nicolas Hurtubise
// MIT License https://gitlab.com/telo-misikeke/telo-misikeke.gitlab.io/#licence
//
// it is automatically modified to be an ES module

/* Parser.js
 * written by Colin Kuebler 2012
 * Part of LDT, dual licensed under GPLv3 and MIT
 * Modified by Nicolas Hurtubise, 2023
 */

function ParserWithCallbacks(rules, useLinebreaks) {
    var api = this;

    function rule_matches(rule, input, behind) {

        var regex, callback;

        if(typeof(rule[0]) === "undefined") {
            // Simple regex, no callback

            regex = rule;
        } else {
            // regex + callback
            regex = rule[0];
            callback = rule[1];
        }

        var match = input.match(regex);

        var does_match = match;

        if(does_match && callback) {
            does_match = callback(match, behind);
        }

        return does_match ? match : false;
    }

    this.tokens = [];

    api.tokenize = function(allInputs) {
        var tokens = [];

        var chunkSeparator = /\n\n/g;

        if(useLinebreaks)
            chunkSeparator = /\n/g;

        var chunks = allInputs.split(chunkSeparator);

        chunks.forEach((input, idx) => {
            var behind = "\x02";

            // \x02 is the ASCII char:       002   2     02    STX (start of text)
            input = '\x02' + input + '\x02';

            while(input.length) {
                var somethingMatches = false;

                for(var key in rules) {
                    var match = rule_matches(rules[key].rule, input, behind);

                    if(match) {
                        var start = match.index;
                        var end = start + match[0].length;

                        tokens.push({
                            text: match[0].replace(/\x02/g, ''),
                            ruleName: key,
                            match: match,
                        });

                        behind += input.slice(0, end);
                        behind = behind.slice(-20); // keep max 20 chars of lookbehind
                        input = input.slice(end);

                        somethingMatches = true;
                        break;
                    }
                }

                if(!somethingMatches) {
                    console.log(input);
                    throw 'Bad set of regexes';
                }
            }

            if(idx != chunks.length - 1) {
                tokens.push({
                    text: useLinebreaks ? '\n' : '\n\n',
                    ruleName: 'lineBreak',
                });
            }
        });

        this.tokens = tokens;

        return tokens;
    };

    /* api.enumerate = function(input) {
     *     let errors = [
     *         // {line, col, category, match, msg}
     *     ];

     *     for(let key in rules) {
     *         if(!rules[key].category)
     *             continue;

     *         // match all errors of that kind
     *         let rule = rules[key].raw_rule;
     *         let textLeft = input;
     *         let behind = "";

     *         while(textLeft.length) {
     *             let match = textLeft.match(rule);
     *         }
     *     }

     *     return errors.sort(function(a, b) {
     *         return a.line - b.line;
     *     });
     * }; */

    return api;
};;
export { ParserWithCallbacks };
