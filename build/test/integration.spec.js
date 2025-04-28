"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
const slack = __importStar(require("../src/slack"));
describe('integration with unified', () => {
    it('should parse raw markdown into slack blocks', async () => {
        const text = `
a **b** _c_ **_d_ e**

# heading **a**

![59953191-480px](https://user-images.githubusercontent.com/16073505/123464383-b8715300-d5ba-11eb-8586-b1f965e1f18d.jpg)

<img src="https://user-images.githubusercontent.com/16073505/123464383-b8715300-d5ba-11eb-8586-b1f965e1f18d.jpg" alt="59953191-480px"/>

> block quote **a**
> block quote b

[link](https://apple.com)

- bullet _a_
- bullet _b_

1. number _a_
2. number _b_

- [ ] checkbox false
- [x] checkbox true

| Syntax      | Description |
| ----------- | ----------- |
| Header      | Title       |
| Paragraph   | Text        |
`;
        const actual = await src_1.markdownToBlocks(text);
        const expected = [
            slack.section('a *b* _c_ *_d_ e*'),
            slack.header('heading a'),
            slack.image('https://user-images.githubusercontent.com/16073505/123464383-b8715300-d5ba-11eb-8586-b1f965e1f18d.jpg', '59953191-480px'),
            slack.image('https://user-images.githubusercontent.com/16073505/123464383-b8715300-d5ba-11eb-8586-b1f965e1f18d.jpg', '59953191-480px'),
            slack.section('> block quote *a*\n> block quote b'),
            slack.section('<https://apple.com|link>'),
            slack.richText([
                slack.richTextList([
                    slack.richTextSection([
                        { type: 'text', text: 'bullet ' },
                        { type: 'text', text: 'a', style: { italic: true } },
                    ]),
                    slack.richTextSection([
                        { type: 'text', text: 'bullet ' },
                        { type: 'text', text: 'b', style: { italic: true } },
                    ]),
                ], 'bullet', 0),
            ]),
            slack.richText([
                slack.richTextList([
                    slack.richTextSection([
                        { type: 'text', text: 'number ' },
                        { type: 'text', text: 'a', style: { italic: true } },
                    ]),
                    slack.richTextSection([
                        { type: 'text', text: 'number ' },
                        { type: 'text', text: 'b', style: { italic: true } },
                    ]),
                ], 'ordered', 0),
            ]),
            slack.richText([
                slack.richTextList([
                    slack.richTextSection([{ type: 'text', text: 'checkbox false' }]),
                    slack.richTextSection([{ type: 'text', text: 'checkbox true' }]),
                ], 'bullet', 0),
            ]),
            slack.section('```\n' +
                '| Syntax | Description |\n' +
                '| --- | --- |\n' +
                '| Header | Title |\n' +
                '| Paragraph | Text |\n' +
                '```'),
        ].flat();
        expect(actual).toStrictEqual(expected);
    });
    it('should parse long markdown', async () => {
        const text = new Array(3500).fill('a').join('') + 'bbbcccdddeee';
        const actual = await src_1.markdownToBlocks(text);
        const expected = slack.section(text);
        expect(actual).toStrictEqual(expected);
    });
    describe('code blocks', () => {
        it('should parse code blocks with no language', async () => {
            const text = `\`\`\`
if (a === 'hi') {
  console.log('hi!')
} else {
  console.log('hello')
}
\`\`\``;
            const actual = await src_1.markdownToBlocks(text);
            const expected = slack.section(`\`\`\`
if (a === 'hi') {
  console.log('hi!')
} else {
  console.log('hello')
}
\`\`\``);
            expect(actual).toStrictEqual(expected);
        });
        it('should parse code blocks with language', async () => {
            const text = `\`\`\`javascript
if (a === 'hi') {
  console.log('hi!')
} else {
  console.log('hello')
}
\`\`\``;
            const actual = await src_1.markdownToBlocks(text);
            const expected = slack.section(`\`\`\`
if (a === 'hi') {
  console.log('hi!')
} else {
  console.log('hello')
}
\`\`\``);
            expect(actual).toStrictEqual(expected);
        });
    });
    it('should correctly escape text', async () => {
        const actual = await src_1.markdownToBlocks('<>&\'""\'&><', { escapeSlack: true });
        const expected = slack.section('&lt;&gt;&amp;\'""\'&amp;&gt;&lt;');
        expect(actual).toStrictEqual(expected);
    });
});
//# sourceMappingURL=integration.spec.js.map