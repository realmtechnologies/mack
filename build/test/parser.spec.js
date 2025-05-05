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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const slack = __importStar(require("../src/slack"));
const internal_1 = require("../src/parser/internal");
const marked_1 = require("marked");
const index_1 = require("../src/index");
const assert_1 = __importDefault(require("assert"));
const slack_1 = require("../src/slack");
describe('parser', () => {
    it('should parse basic markdown', () => {
        const tokens = marked_1.marked.lexer('**a ~b~** c[*d*](https://example.com)');
        const actual = internal_1.parseBlocks(tokens);
        const expected = slack.section('*a ~b~* c<https://example.com|_d_>');
        expect(actual.blocks).toStrictEqual(expected);
    });
    it('should parse header', () => {
        const tokens = marked_1.marked.lexer('# a');
        const actual = internal_1.parseBlocks(tokens);
        const expected = [slack.header('a')];
        expect(actual.blocks).toStrictEqual(expected);
    });
    it('should parse thematic break', () => {
        const tokens = marked_1.marked.lexer('---');
        const actual = internal_1.parseBlocks(tokens);
        const expected = [slack.divider()];
        expect(actual.blocks).toStrictEqual(expected);
    });
    it('should parse lists', () => {
        const tokens = marked_1.marked.lexer(`
    1. a
    2. b
    - c
    - d
    * e
    * f
    `
            .trim()
            .split('\n')
            .map(s => s.trim())
            .join('\n'));
        const actual = internal_1.parseBlocks(tokens);
        const expected = [
            slack.richText([
                slack.richTextList([
                    slack.richTextSection([{ type: 'text', text: 'a' }]),
                    slack.richTextSection([{ type: 'text', text: 'b' }]),
                ], 'ordered', 0),
                slack.richTextList([
                    slack.richTextSection([{ type: 'text', text: 'c' }]),
                    slack.richTextSection([{ type: 'text', text: 'd' }]),
                ], 'bullet', 0),
                slack.richTextList([
                    slack.richTextSection([{ type: 'text', text: 'e' }]),
                    slack.richTextSection([{ type: 'text', text: 'f' }]),
                ], 'bullet', 0),
            ]),
        ];
        expect(actual.blocks).toStrictEqual(expected);
    });
    it('should parse images', () => {
        const tokens = marked_1.marked.lexer('![alt](url "title")![](url)');
        const actual = internal_1.parseBlocks(tokens);
        const expected = [
            slack.image('url', 'alt', 'title'),
            slack.image('url', 'url'),
        ];
        expect(actual.blocks).toStrictEqual(expected);
    });
});
it('should truncate basic markdown', () => {
    const a4000 = new Array(4000).fill('a').join('');
    const tokens = marked_1.marked.lexer(a4000);
    const actual = internal_1.parseBlocks(tokens);
    const expected = slack.section(a4000);
    expect(actual.blocks.length).toStrictEqual(expected.length);
});
it('should truncate header', () => {
    const a200 = new Array(200).fill('a').join('');
    const a150 = new Array(150).fill('a').join('');
    const tokens = marked_1.marked.lexer(`# ${a200}`);
    const actual = internal_1.parseBlocks(tokens);
    const expected = [slack.header(a150)];
    expect(actual.blocks.length).toStrictEqual(expected.length);
});
it('should truncate image title', () => {
    const a3000 = new Array(3000).fill('a').join('');
    const a2000 = new Array(2000).fill('a').join('');
    const tokens = marked_1.marked.lexer(`![${a3000}](url)`);
    const actual = internal_1.parseBlocks(tokens);
    const expected = [slack.image('url', a2000)];
    expect(actual.blocks.length).toStrictEqual(expected.length);
});
describe('rich text lists', () => {
    it('another test case', async () => {
        const markdown = `
Realm has raised a Pre-Seed round of almost €1.7M from the following investors [z8-0]:

*   Lifeline Ventures [z8-1]
*   Illusian, an angel collective composed of [z8-1]:
    *   Ilkka Paananen, Co-founder & CEO of Supercell [z8-1]
    *   Miki Kuusi, Co-founder & CEO of Wolt [z8-1]
    *   Robert Gentz, Co-founder & Co-CEO of Zalando [z8-1]
    *   Eléonore Crespo, Co-founder & CEO of Pigment [z8-1]
    *   Oskari Saarenmaa, Co-founder & CEO of Aiven [z8-1]
    *   Kristo Ovaska, Founder and ex-CEO of Smartly [z8-1]
    *   Anssi Rusi, Co-CEO of Supermetrics, ex-Founding COO of Smartly [z8-1]
    *   Marianne Vikkula, COO of Wolt [z8-1]
    *   Riku Mäkelä, COO, International at DoorDash [z8-1]
*   Guy Podjarny, Co-founder & President of Snyk [z8-2]
*   Jussi Laakkonen, (Co-)Founder of Applifier and Noice, ex-EVP at Unity [z8-2]
*   Otto Hilska, Founder & CEO of Swarmia, ex-CPO of Smartly.io [z8-2]
*   Peter Downs, ex-Director of Engineering at Pipe [z8-2]
*   Jiri Heinonen, Co-founder of Swappie [z8-2]
*   Usman Masood, ex-CTO of Pipe [z8-2]
*   Bjarke Klinge Staun, angel investor, ex-VC (Pleo, Trade Republic, Bolt) [z8-2]
*   Thijn Lamers, angel investor, Founding team of Adyen [z8-2]
*   Anniina Sulku, Comms Lead at Aiven [z8-3]`;
        const expectedBlocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: 'Realm has raised a Pre-Seed round of almost €1.7M from the following investors [z8-0]:',
                },
            },
            {
                type: 'rich_text',
                elements: [
                    {
                        type: 'rich_text_list',
                        style: 'bullet',
                        indent: 0,
                        elements: [
                            {
                                type: 'rich_text_section',
                                elements: [{ type: 'text', text: 'Lifeline Ventures [z8-1]' }],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Illusian, an angel collective composed of [z8-1]:',
                                    },
                                ],
                            },
                        ],
                    },
                    // Nested List for Illusian angels
                    {
                        type: 'rich_text_list',
                        style: 'bullet',
                        indent: 1,
                        elements: [
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Ilkka Paananen, Co-founder & CEO of Supercell [z8-1]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Miki Kuusi, Co-founder & CEO of Wolt [z8-1]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Robert Gentz, Co-founder & Co-CEO of Zalando [z8-1]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Eléonore Crespo, Co-founder & CEO of Pigment [z8-1]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Oskari Saarenmaa, Co-founder & CEO of Aiven [z8-1]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Kristo Ovaska, Founder and ex-CEO of Smartly [z8-1]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Anssi Rusi, Co-CEO of Supermetrics, ex-Founding COO of Smartly [z8-1]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    { type: 'text', text: 'Marianne Vikkula, COO of Wolt [z8-1]' },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Riku Mäkelä, COO, International at DoorDash [z8-1]',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        type: 'rich_text_list',
                        style: 'bullet',
                        indent: 0,
                        elements: [
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Guy Podjarny, Co-founder & President of Snyk [z8-2]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Jussi Laakkonen, (Co-)Founder of Applifier and Noice, ex-EVP at Unity [z8-2]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Otto Hilska, Founder & CEO of Swarmia, ex-CPO of Smartly.io [z8-2]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Peter Downs, ex-Director of Engineering at Pipe [z8-2]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Jiri Heinonen, Co-founder of Swappie [z8-2]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Usman Masood, ex-CTO of Pipe [z8-2]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Bjarke Klinge Staun, angel investor, ex-VC (Pleo, Trade Republic, Bolt) [z8-2]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Thijn Lamers, angel investor, Founding team of Adyen [z8-2]',
                                    },
                                ],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Anniina Sulku, Comms Lead at Aiven [z8-3]',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ];
        const result = await index_1.markdownToBlocks(markdown, { escapeSlack: false });
        assert_1.default.deepStrictEqual(result.blocks, expectedBlocks);
    });
    it('should parse nested bullet lists into rich_text block', async () => {
        const markdown = `Investors included:
*   **Lead Investor**: Lead Investor Name
*   **Angel Collective**:
    *   Angel Investor 1
    *   Angel Investor 2
*   **Individual Investors**:
    *   Individual Investor 1
    *   Individual Investor 2`;
        const expectedBlocks = [
            // Initial paragraph
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: 'Investors included:',
                },
            },
            {
                type: 'rich_text',
                elements: [
                    // Top-level list
                    {
                        type: 'rich_text_list',
                        style: 'bullet',
                        indent: 0,
                        elements: [
                            // Item 1 Section
                            {
                                type: 'rich_text_section',
                                elements: [
                                    { type: 'text', text: 'Lead Investor', style: { bold: true } },
                                    { type: 'text', text: ': Lead Investor Name' },
                                ],
                            },
                            // Item 2 Section
                            {
                                type: 'rich_text_section',
                                elements: [
                                    { type: 'text', text: 'Angel Collective', style: { bold: true } },
                                    { type: 'text', text: ':' },
                                ],
                            },
                        ],
                    },
                    // Nested List 1 (follows the item it's nested under)
                    {
                        type: 'rich_text_list',
                        style: 'bullet',
                        indent: 1,
                        elements: [
                            {
                                type: 'rich_text_section',
                                elements: [{ type: 'text', text: 'Angel Investor 1' }],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [{ type: 'text', text: 'Angel Investor 2' }],
                            },
                        ],
                    },
                    {
                        type: 'rich_text_list',
                        style: 'bullet',
                        indent: 0,
                        elements: [
                            // Item 3 Section (placeholder for nested list)
                            {
                                type: 'rich_text_section',
                                elements: [
                                    {
                                        type: 'text',
                                        text: 'Individual Investors',
                                        style: { bold: true },
                                    },
                                    { type: 'text', text: ':' },
                                ],
                            },
                        ],
                    },
                    // Nested List 2 (follows the item it's nested under)
                    {
                        type: 'rich_text_list',
                        style: 'bullet',
                        indent: 1,
                        elements: [
                            {
                                type: 'rich_text_section',
                                elements: [{ type: 'text', text: 'Individual Investor 1' }],
                            },
                            {
                                type: 'rich_text_section',
                                elements: [{ type: 'text', text: 'Individual Investor 2' }],
                            },
                        ],
                    },
                ],
            },
        ];
        const result = await index_1.markdownToBlocks(markdown);
        assert_1.default.deepStrictEqual(result.blocks, expectedBlocks);
    });
});
describe('table parsing', () => {
    it('should parse a table into an ASCII code block by default', async () => {
        const markdown = `
| Header 1 | Header 2 | Header 3 |
|---|---|---|
| R1C1 | R1C2 | R1C3 |
| R2 C1 | R2 C2 | R2 C3 |
    `;
        const expectedAsciiTable = `\`\`\`
┌──────────┬──────────┬──────────┐
│ Header 1 │ Header 2 │ Header 3 │
├──────────┼──────────┼──────────┤
│ R1C1     │ R1C2     │ R1C3     │
│ R2 C1    │ R2 C2    │ R2 C3    │
└──────────┴──────────┴──────────┘
\`\`\``;
        const expectedBlocks = slack.section(expectedAsciiTable);
        const result = await index_1.markdownToBlocks(markdown);
        assert_1.default.deepStrictEqual(result.blocks, expectedBlocks);
        assert_1.default.strictEqual(result.tables, undefined);
    });
    it('should extract table data when extractTables is true', async () => {
        const markdown = `
| Header 1 | Header 2 | Header 3 |
|---|---|---|
| R1C1 | R1C2 | R1C3 |
| R2 C1 | R2 C2 | R2 C3 |
    `;
        const expectedTables = [
            [
                ['Header 1', 'Header 2', 'Header 3'],
                ['R1C1', 'R1C2', 'R1C3'],
                ['R2 C1', 'R2 C2', 'R2 C3'],
            ],
        ];
        const result = await index_1.markdownToBlocks(markdown, { extractTables: true });
        // No blocks should be generated for the table itself when extracting
        assert_1.default.deepStrictEqual(result.blocks, []);
        assert_1.default.deepStrictEqual(result.tables, expectedTables);
    });
    it('should parse a table into an ASCII code block when extractTables is false', async () => {
        const markdown = `
| Header 1 | Header 2 | Header 3 |
|---|---|---|
| R1C1 | R1C2 | R1 C3 |
| Row 2, Col 1 | R2 C2 | R2 C3 |
    `;
        // Note: Column widths are determined by the longest cell content in each column.
        // 'Row 2, Col 1' (12) > 'Header 1' (8) > 'R1C1' (4)
        // 'Header 2' (8) > 'R1C2' (4) > 'R2 C2' (5)
        // 'Header 3' (8) > 'R1 C3' (5) > 'R2 C3' (5)
        const expectedAsciiTable = `\`\`\`
┌──────────────┬──────────┬──────────┐
│ Header 1     │ Header 2 │ Header 3 │
├──────────────┼──────────┼──────────┤
│ R1C1         │ R1C2     │ R1 C3    │
│ Row 2, Col 1 │ R2 C2    │ R2 C3    │
└──────────────┴──────────┴──────────┘
\`\`\``;
        const expectedBlocks = slack.section(expectedAsciiTable);
        const result = await index_1.markdownToBlocks(markdown, { extractTables: false });
        // Check block content
        assert_1.default.deepStrictEqual(result.blocks, expectedBlocks);
        // Ensure tables array is undefined or empty when using ascii format
        assert_1.default.strictEqual(result.tables, undefined);
    });
    it('should format a 2-column table as fields blocks regardless of extractTables option', async () => {
        const markdown = `
| Month    | Savings |
| :------- | ------: |
| January  |   $250  |
| February |    $80  |
| March    |   $420  |
    `;
        const expectedBlocks = [
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: '*Month*' },
                    { type: 'mrkdwn', text: '*Savings*' },
                ],
            },
            slack_1.divider(),
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: 'January' },
                    { type: 'mrkdwn', text: '$250' },
                ],
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: 'February' },
                    { type: 'mrkdwn', text: '$80' },
                ],
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: 'March' },
                    { type: 'mrkdwn', text: '$420' },
                ],
            },
        ];
        // Test with default options
        let result = await index_1.markdownToBlocks(markdown);
        assert_1.default.deepStrictEqual(result.blocks, expectedBlocks, 'Test Failed: Default options');
        assert_1.default.strictEqual(result.tables, undefined, 'Test Failed: Default options (tables)');
        // Test with extractTables: true
        result = await index_1.markdownToBlocks(markdown, { extractTables: true });
        assert_1.default.deepStrictEqual(result.blocks, expectedBlocks, 'Test Failed: extractTables: true');
        assert_1.default.strictEqual(result.tables, undefined, 'Test Failed: extractTables: true (tables)');
        // Test with extractTables: 'ascii'
        result = await index_1.markdownToBlocks(markdown, { extractTables: false });
        assert_1.default.deepStrictEqual(result.blocks, expectedBlocks, 'Test Failed: extractTables: false');
        assert_1.default.strictEqual(result.tables, undefined, 'Test Failed: extractTables: false (tables)');
    });
    it("should parse a table into a rich_text_list when extractTables is 'list'", async () => {
        const markdown = `
| Item      | Qty | Price *each* |
| :-------- | :-: | -----------: |
| Apples    |  5  | €1.50        |
| Oranges   | 12  | ~€1.00~ €0.80 |
    `;
        const expectedBlocks = [
            {
                elements: [
                    {
                        elements: [
                            {
                                elements: [
                                    { style: { bold: true }, text: 'Item', type: 'text' },
                                    { text: 'Apples', type: 'text' },
                                ],
                                type: 'rich_text_section',
                            },
                            {
                                elements: [
                                    { style: { bold: true }, text: 'Qty', type: 'text' },
                                    { text: '5', type: 'text' },
                                ],
                                type: 'rich_text_section',
                            },
                            {
                                elements: [
                                    { style: { bold: true }, text: 'Price ', type: 'text' },
                                    {
                                        style: { bold: true, italic: true },
                                        text: 'each',
                                        type: 'text',
                                    },
                                    { text: '€1.50', type: 'text' },
                                ],
                                type: 'rich_text_section',
                            },
                        ],
                        indent: 0,
                        style: 'bullet',
                        type: 'rich_text_list',
                    },
                    {
                        elements: [
                            {
                                elements: [
                                    { style: { bold: true }, text: 'Item', type: 'text' },
                                    { text: 'Oranges', type: 'text' },
                                ],
                                type: 'rich_text_section',
                            },
                            {
                                elements: [
                                    { style: { bold: true }, text: 'Qty', type: 'text' },
                                    { text: '12', type: 'text' },
                                ],
                                type: 'rich_text_section',
                            },
                            {
                                elements: [
                                    { style: { bold: true }, text: 'Price ', type: 'text' },
                                    {
                                        style: { bold: true, italic: true },
                                        text: 'each',
                                        type: 'text',
                                    },
                                    { style: { strike: true }, text: '€1.00', type: 'text' },
                                    { style: { bold: true }, text: 'Price ', type: 'text' },
                                    {
                                        style: { bold: true, italic: true },
                                        text: 'each',
                                        type: 'text',
                                    },
                                    { text: ' €0.80', type: 'text' },
                                ],
                                type: 'rich_text_section',
                            },
                        ],
                        indent: 0,
                        style: 'bullet',
                        type: 'rich_text_list',
                    },
                ],
                type: 'rich_text',
            },
        ];
        const result = await index_1.markdownToBlocks(markdown, { extractTables: 'list' });
        assert_1.default.deepStrictEqual(result.blocks, expectedBlocks);
        assert_1.default.strictEqual(result.tables, undefined);
    });
});
//# sourceMappingURL=parser.spec.js.map