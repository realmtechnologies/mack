"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBlocks = void 0;
const slack_1 = require("../slack");
const fast_xml_parser_1 = require("fast-xml-parser");
function parsePlainText(element) {
    var _a;
    switch (element.type) {
        case 'link':
        case 'em':
        case 'strong':
        case 'del':
            return element.tokens.flatMap(child => parsePlainText(child));
        case 'br':
            return [];
        case 'image':
            return [(_a = element.title) !== null && _a !== void 0 ? _a : element.href];
        case 'codespan':
        case 'text':
        case 'html':
            return [element.raw];
    }
}
function isSectionBlock(block) {
    return block.type === 'section';
}
function escapeForSlack(text, escape) {
    if (!escape)
        return text;
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function parseMrkdwnRichText(element, options) {
    var _a, _b, _c, _d, _e, _f, _g;
    const shouldEscape = (options === null || options === void 0 ? void 0 : options.escapeSlack) !== false;
    switch (element.type) {
        case 'link': {
            const textContent = ((_a = element.tokens) === null || _a === void 0 ? void 0 : _a.map(t => t.raw).join('')) || element.text;
            return [{ type: 'link', url: element.href, text: textContent }];
        }
        case 'image':
            return [
                { type: 'text', text: element.title || element.text || element.href },
            ];
        case 'em': {
            const children = (_c = (_b = element.tokens) === null || _b === void 0 ? void 0 : _b.flatMap(child => parseMrkdwnRichText(child, options))) !== null && _c !== void 0 ? _c : [];
            return children.map(child => ({
                ...child,
                style: { ...('style' in child ? child.style : {}), italic: true },
            }));
        }
        case 'codespan':
            return [{ type: 'text', text: `\`${element.text}\`` }];
        case 'strong': {
            const children = (_e = (_d = element.tokens) === null || _d === void 0 ? void 0 : _d.flatMap(child => parseMrkdwnRichText(child, options))) !== null && _e !== void 0 ? _e : [];
            return children.map(child => ({
                ...child,
                style: { ...('style' in child ? child.style : {}), bold: true },
            }));
        }
        case 'del': {
            const children = (_g = (_f = element.tokens) === null || _f === void 0 ? void 0 : _f.flatMap(child => parseMrkdwnRichText(child, options))) !== null && _g !== void 0 ? _g : [];
            return children.map(child => ({
                ...child,
                style: { ...('style' in child ? child.style : {}), strike: true },
            }));
        }
        case 'text': {
            const textToUse = escapeForSlack(element.text, shouldEscape);
            return [{ type: 'text', text: textToUse }];
        }
        case 'html': {
            const htmlTextToUse = escapeForSlack(element.text, shouldEscape);
            return [{ type: 'text', text: htmlTextToUse }];
        }
        case 'br':
            return [{ type: 'text', text: '\n' }];
        default:
            return [];
    }
}
function parseListItemContents(tokens, options) {
    const elements = [];
    for (const token of tokens) {
        switch (token.type) {
            case 'text':
                if (token.tokens) {
                    elements.push(...token.tokens.flatMap(t => parseMrkdwnRichText(t, options)));
                }
                else {
                    elements.push(...parseMrkdwnRichText(token, options));
                }
                break;
            case 'link':
            case 'em':
            case 'strong':
            case 'del':
            case 'codespan':
            case 'br':
            case 'image':
            case 'html':
                elements.push(...parseMrkdwnRichText(token, options));
                break;
            case 'paragraph':
                if (token.tokens) {
                    elements.push(...token.tokens.flatMap(t => parseMrkdwnRichText(t, options)));
                    elements.push({ type: 'text', text: '\n' });
                }
                break;
            case 'space':
                break;
            default:
                console.warn('Unsupported token type in list item content:', token.type);
        }
    }
    return elements.filter(elem => !(elem.type === 'text' &&
        typeof elem.text === 'string' &&
        elem.text === '' &&
        !elem.style));
}
function phrasingTokensToMrkdwnString(tokens, options) {
    var _a, _b, _c, _d;
    const shouldEscape = (options === null || options === void 0 ? void 0 : options.escapeSlack) !== false;
    let mrkdwn = '';
    for (const token of tokens) {
        switch (token.type) {
            case 'link': {
                const linkContent = (_a = token.tokens) !== null && _a !== void 0 ? _a : [];
                const linkText = phrasingTokensToMrkdwnString(linkContent, options);
                const displayLinkText = linkText.trim() || token.text || token.href;
                mrkdwn += `<${token.href}|${displayLinkText}>`;
                break;
            }
            case 'image': {
                mrkdwn += token.text || token.title || token.href;
                break;
            }
            case 'strong': {
                const strongContent = (_b = token.tokens) !== null && _b !== void 0 ? _b : [];
                mrkdwn += `*${phrasingTokensToMrkdwnString(strongContent, options)}*`;
                break;
            }
            case 'em': {
                const emContent = (_c = token.tokens) !== null && _c !== void 0 ? _c : [];
                mrkdwn += `_${phrasingTokensToMrkdwnString(emContent, options)}_`;
                break;
            }
            case 'del': {
                const delContent = (_d = token.tokens) !== null && _d !== void 0 ? _d : [];
                mrkdwn += `~${phrasingTokensToMrkdwnString(delContent, options)}~`;
                break;
            }
            case 'codespan': {
                const escapedCode = escapeForSlack(token.text, shouldEscape);
                mrkdwn += `\`${escapedCode}\``;
                break;
            }
            case 'br': {
                mrkdwn += '\\n';
                break;
            }
            case 'text': {
                const escapedText = escapeForSlack(token.text, shouldEscape);
                mrkdwn += escapedText;
                break;
            }
            case 'html': {
                mrkdwn += token.text;
                break;
            }
            default: {
                const raw = 'raw' in token ? token.raw : '';
                if (raw) {
                    const escapedRaw = escapeForSlack(raw, shouldEscape);
                    mrkdwn += escapedRaw;
                }
            }
        }
    }
    return mrkdwn;
}
function parseParagraph(element, options) {
    const accumulator = [];
    let currentPhrasingTokens = [];
    const flushPhrasingTokens = () => {
        if (currentPhrasingTokens.length > 0) {
            const mrkdwnText = phrasingTokensToMrkdwnString(currentPhrasingTokens, options).trim();
            if (mrkdwnText) {
                for (const block of slack_1.section(mrkdwnText, { splitParagraphs: true })) {
                    accumulator.push(block);
                }
            }
            currentPhrasingTokens = [];
        }
    };
    for (const token of element.tokens) {
        switch (token.type) {
            case 'image':
                flushPhrasingTokens();
                accumulator.push(slack_1.image(token.href, token.text ||
                    token.title ||
                    token.href, token.title || undefined));
                break;
            case 'space':
                currentPhrasingTokens.push({
                    type: 'text',
                    raw: ' ',
                    text: ' ',
                });
                break;
            case 'text':
            case 'link':
            case 'strong':
            case 'em':
            case 'del':
            case 'codespan':
            case 'br':
            case 'html':
                currentPhrasingTokens.push(token);
                break;
            default:
                break;
        }
    }
    flushPhrasingTokens();
    return accumulator;
}
function parseHeading(element) {
    return slack_1.header(element.tokens
        .flatMap(child => parsePlainText(child))
        .join(''));
}
function parseCode(element) {
    const accumulator = [];
    for (const block of slack_1.section(`\`\`\`\n${element.text}\n\`\`\``)) {
        accumulator.push(block);
    }
    return accumulator;
}
function parseList(element, options = {}, indent = 0) {
    const result = [];
    let currentLevelSections = [];
    function flushCurrentLevelSections() {
        if (currentLevelSections.length > 0) {
            const style = element.ordered ? 'ordered' : 'bullet';
            result.push(slack_1.richTextList(currentLevelSections, style, indent));
            currentLevelSections = [];
        }
    }
    for (const item of element.items) {
        const itemContentTokens = [];
        const itemNestedLists = [];
        // Separate content and nested lists
        for (const token of item.tokens) {
            if (token.type === 'list') {
                itemNestedLists.push(token);
            }
            else {
                itemContentTokens.push(token);
            }
        }
        const contentElements = parseListItemContents(itemContentTokens, options);
        // Always add the content section (if any) to the current buffer first.
        if (contentElements.length > 0) {
            currentLevelSections.push(slack_1.richTextSection(contentElements));
        }
        // If this item *also* has nested lists, NOW flush the buffer
        // (which includes the parent item we just added) before processing nests.
        if (itemNestedLists.length > 0) {
            flushCurrentLevelSections();
            // Process nested lists
            for (const nestedListToken of itemNestedLists) {
                result.push(...parseList(nestedListToken, options, indent + 1));
            }
        }
    }
    // Flush any remaining items at the end
    flushCurrentLevelSections();
    return result;
}
function parseTableRow(row, options) {
    const parsedCells = [];
    row.forEach(cell => {
        parsedCells.push(parseTableCell(cell, options));
    });
    return parsedCells;
}
function parseTableCell(cell, options) {
    // Parse phrasing tokens within the cell into Slack rich text elements
    const richTextElements = cell.tokens.flatMap(token => parseMrkdwnRichText(token, options));
    // Simple trim: remove leading/trailing empty/whitespace-only text elements
    let startIndex = 0;
    while (startIndex < richTextElements.length) {
        const elem = richTextElements[startIndex];
        if (elem.type === 'text' &&
            !elem.text.trim() &&
            !elem.style // Keep styled empty elements
        ) {
            startIndex++;
        }
        else {
            break;
        }
    }
    let endIndex = richTextElements.length - 1;
    while (endIndex >= startIndex) {
        const elem = richTextElements[endIndex];
        if (elem.type === 'text' &&
            !elem.text.trim() &&
            !elem.style // Keep styled empty elements
        ) {
            endIndex--;
        }
        else {
            break;
        }
    }
    return richTextElements.slice(startIndex, endIndex + 1);
}
// Helper to convert rich text elements to a plain string (simplified)
function richTextElementsToString(elements) {
    return elements
        .map(el => {
        if (el.type === 'text')
            return el.text;
        if (el.type === 'link')
            return el.text || el.url;
        if (el.type === 'emoji')
            return `:${el.name}:`;
        // Add other element types as needed
        return '';
    })
        .join('');
}
function parseTable(element, options) {
    // Updated return type
    const headerRichTextCells = parseTableRow(element.header, options);
    const numCols = headerRichTextCells.length;
    // --- BEGIN 2-COLUMN HANDLING --- (Adapted for Rich Text)
    if (numCols === 2 &&
        element.rows.length < 8 &&
        options.extractTables !== 'list') {
        // Added check for extractTables !== 'list'
        const blocks = [];
        const headerStrings = headerRichTextCells.map(richTextElementsToString);
        if (headerStrings.length === 2) {
            blocks.push({
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*${headerStrings[0]}*` },
                    { type: 'mrkdwn', text: `*${headerStrings[1]}*` },
                ],
            });
            if (element.rows.length) {
                blocks.push(slack_1.divider());
            }
        }
        element.rows.forEach(row => {
            const dataRichTextCells = parseTableRow(row, options);
            const dataStrings = dataRichTextCells.map(richTextElementsToString);
            if (dataStrings.length === 2) {
                blocks.push({
                    type: 'section',
                    fields: [
                        { type: 'mrkdwn', text: dataStrings[0] },
                        { type: 'mrkdwn', text: dataStrings[1] },
                    ],
                });
            }
        });
        return { type: 'blocks', value: blocks }; // Return structured type
    }
    // --- END 2-COLUMN HANDLING ---
    const parseRowsToStringArray = () => {
        const headerStrings = headerRichTextCells.map(richTextElementsToString);
        const dataRowsStrings = element.rows.map(row => {
            const richTextRow = parseTableRow(row, options);
            return richTextRow.map(richTextElementsToString);
        });
        return [headerStrings, ...dataRowsStrings];
    };
    const parseRowsToAsciiTable = () => {
        const headerStrings = headerRichTextCells.map(richTextElementsToString);
        const dataRowsStrings = element.rows.map(row => {
            const richTextRow = parseTableRow(row, options);
            return richTextRow.map(richTextElementsToString);
        });
        const allRows = [headerStrings, ...dataRowsStrings];
        if (allRows.length === 0 || allRows[0].length === 0) {
            return [];
        }
        const colWidths = new Array(numCols).fill(0);
        for (const row of allRows) {
            for (let i = 0; i < numCols; i++) {
                const cellContent = row[i] || '';
                colWidths[i] = Math.max(colWidths[i], cellContent.length);
            }
        }
        const formatRow = (row, separator) => {
            const paddedCells = row.map((cell, i) => (cell || '').padEnd(colWidths[i]));
            return `${separator} ${paddedCells.join(` ${separator} `)} ${separator}`;
        };
        const createSeparator = (left, middle, right, line) => {
            const parts = colWidths.map(width => line.repeat(width + 2));
            return `${left}${parts.join(middle)}${right}`;
        };
        const topBorder = createSeparator('┌', '┬', '┐', '─');
        const headerSeparator = createSeparator('├', '┼', '┤', '─');
        const bottomBorder = createSeparator('└', '┴', '┘', '─');
        const asciiRows = [];
        asciiRows.push(topBorder);
        asciiRows.push(formatRow(headerStrings, '│'));
        asciiRows.push(headerSeparator);
        dataRowsStrings.forEach(row => {
            asciiRows.push(formatRow(row, '│'));
        });
        asciiRows.push(bottomBorder);
        const asciiTableString = asciiRows.join('\n');
        const accumulator = [];
        for (const block of slack_1.section(`\`\`\`\n${asciiTableString}\n\`\`\``)) {
            accumulator.push(block);
        }
        return accumulator;
    };
    // --- NEW LOGIC FOR extractTables: 'list' ---
    if (options.extractTables === 'list') {
        const allCellSections = [];
        const headerElements = headerRichTextCells; // Already parsed
        // Add header cell sections
        headerElements.forEach(cellContent => {
            if (cellContent.length > 0) { // Don't add empty sections
                allCellSections.push(slack_1.richTextSection(cellContent));
            }
        });
        // Add data cell sections
        element.rows.forEach(row => {
            const rowCellElements = parseTableRow(row, options);
            rowCellElements.forEach(cellContent => {
                if (cellContent.length > 0) { // Don't add empty sections
                    allCellSections.push(slack_1.richTextSection(cellContent));
                }
            });
        });
        // Only create list if there are sections
        if (allCellSections.length > 0) {
            return { type: 'tableCellsAsRichTextSections', value: allCellSections };
        }
        else {
            // Return empty blocks if no list sections were generated
            return { type: 'blocks', value: [] };
        }
    }
    // --- END NEW LOGIC ---
    if (options.extractTables === true) {
        // Check for boolean true
        return { type: 'tableArray', value: parseRowsToStringArray() }; // Return structured type
    }
    else {
        // Default to ASCII table if extractTables is false or undefined
        return { type: 'blocks', value: parseRowsToAsciiTable() }; // Return structured type
    }
}
function parseBlockquote(element, options) {
    return element.tokens
        .filter((child) => child.type === 'paragraph')
        .flatMap(p => parseParagraph(p, options).map(block => {
        var _a, _b;
        if (isSectionBlock(block) && ((_b = (_a = block.text) === null || _a === void 0 ? void 0 : _a.text) === null || _b === void 0 ? void 0 : _b.includes('\n')))
            block.text.text = '> ' + block.text.text.replace(/\n/g, '\n> ');
        return block;
    }));
}
function parseThematicBreak() {
    return slack_1.divider();
}
function parseHTML(element) {
    const parser = new fast_xml_parser_1.XMLParser({ ignoreAttributes: false });
    const res = parser.parse(element.raw);
    if (res.img) {
        const tags = res.img instanceof Array ? res.img : [res.img];
        return tags
            .map((img) => {
            const url = img['@_src'];
            return slack_1.image(url, img['@_alt'] || url);
        })
            .filter((e) => !!e);
    }
    else
        return [];
}
function parseToken(token, options) {
    switch (token.type) {
        case 'heading':
            return {
                type: 'blocks',
                value: [parseHeading(token)],
            };
        case 'paragraph':
            return {
                type: 'blocks',
                value: parseParagraph(token, options),
            };
        case 'code':
            return { type: 'blocks', value: parseCode(token) };
        case 'blockquote':
            return {
                type: 'blocks',
                value: parseBlockquote(token, options),
            };
        case 'list':
            return {
                type: 'richtext',
                value: parseList(token, options),
            };
        case 'table': {
            const parsed = parseTable(token, options);
            switch (parsed.type) {
                case 'blocks':
                    return { type: 'blocks', value: parsed.value };
                case 'tableArray':
                    return { type: 'tableArray', value: parsed.value };
                case 'tableCellsAsRichTextSections':
                    return { type: 'tableCellsAsRichTextSections', value: parsed.value };
                default:
                    return { type: 'blocks', value: [] };
            }
        }
        case 'hr':
            return { type: 'blocks', value: [parseThematicBreak()] };
        case 'html':
            return { type: 'blocks', value: parseHTML(token) };
        case 'image':
            return {
                type: 'blocks',
                value: [
                    slack_1.image(token.href, token.text || token.title || token.href, token.title || undefined),
                ],
            };
        case 'space':
            return { type: 'blocks', value: [] }; // Represent no-op clearly
        default:
            console.warn('Unhandled token type:', token.type);
            return { type: 'blocks', value: [] }; // Represent no-op clearly
    }
}
function parseBlocks(tokens, options = {}) {
    const resultBlocks = [];
    const extractedTables = [];
    let currentRichTextElements = [];
    function finalizeRichText() {
        if (currentRichTextElements.length > 0) {
            resultBlocks.push(slack_1.richText(currentRichTextElements));
            currentRichTextElements = [];
        }
    }
    for (const token of tokens) {
        const parsed = parseToken(token, options);
        switch (parsed.type) {
            case 'blocks':
                if (parsed.value.length > 0) {
                    finalizeRichText();
                    resultBlocks.push(...parsed.value);
                }
                break;
            case 'richtext': // Handles regular rich text (e.g., from standard lists)
                if (parsed.value.length > 0) {
                    currentRichTextElements.push(...parsed.value);
                }
                break;
            case 'tableArray':
                if (parsed.value.length > 0) {
                    finalizeRichText();
                    extractedTables.push(parsed.value);
                }
                break;
            case 'tableCellsAsRichTextSections': // Handle the new type for table-list conversion
                if (parsed.value.length > 0) {
                    finalizeRichText(); // Finalize any pending standard rich text
                    // The value is an array of RichTextSection elements.
                    // Wrap these sections in a rich_text_list, then in a rich_text block.
                    const listElement = slack_1.richTextList(parsed.value, 'bullet', 0);
                    resultBlocks.push(slack_1.richText([listElement]));
                }
                break;
        }
        if (token.type === 'space') {
            finalizeRichText();
        }
    }
    finalizeRichText();
    return {
        blocks: resultBlocks,
        tables: extractedTables.length > 0 ? extractedTables : undefined,
    };
}
exports.parseBlocks = parseBlocks;
//# sourceMappingURL=internal.js.map