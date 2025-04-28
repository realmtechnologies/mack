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
    // Return elements without merging for now
    return elements.filter(elem => !(elem.type === 'text' &&
        typeof elem.text === 'string' &&
        elem.text === '' &&
        !elem.style)); // Still filter empty text
}
function parsePhrasingContentToStrings(element, accumulator, options) {
    var _a, _b, _c;
    if (element.type === 'image') {
        accumulator.push((_c = (_b = (_a = element.href) !== null && _a !== void 0 ? _a : element.title) !== null && _b !== void 0 ? _b : element.text) !== null && _c !== void 0 ? _c : 'image');
    }
    else {
        const text = parseMrkdwnRichText(element, options)
            .map(e => ('text' in e ? e.text : ''))
            .join('');
        accumulator.push(text);
    }
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
                for (const block of slack_1.section(mrkdwnText)) {
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
function combineBetweenPipes(texts) {
    return `| ${texts.join(' | ')} |`;
}
function parseTableRows(rows, options) {
    const parsedRows = [];
    rows.forEach((row, index) => {
        const parsedCells = parseTableRow(row, options);
        if (index === 1) {
            const headerRowArray = new Array(parsedCells.length).fill('---');
            const headerRow = combineBetweenPipes(headerRowArray);
            parsedRows.push(headerRow);
        }
        parsedRows.push(combineBetweenPipes(parsedCells));
    });
    return parsedRows;
}
function parseTableRow(row, options) {
    const parsedCells = [];
    row.forEach(cell => {
        parsedCells.push(parseTableCell(cell, options));
    });
    return parsedCells;
}
function parseTableCell(cell, options) {
    const texts = cell.tokens.reduce((accumulator, child) => {
        parsePhrasingContentToStrings(child, accumulator, options);
        return accumulator;
    }, []);
    return texts.join(' ');
}
function parseTable(element, options) {
    const parsedRows = parseTableRows([element.header, ...element.rows], options);
    const accumulator = [];
    for (const block of slack_1.section(`\`\`\`\n${parsedRows.join('\n')}\n\`\`\``)) {
        accumulator.push(block);
    }
    return accumulator;
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
            return [parseHeading(token)];
        case 'paragraph':
            return parseParagraph(token, options);
        case 'code':
            return parseCode(token);
        case 'blockquote':
            return parseBlockquote(token, options);
        case 'list':
            return parseList(token, options);
        case 'table':
            return parseTable(token, options);
        case 'hr':
            return [parseThematicBreak()];
        case 'html':
            return parseHTML(token);
        case 'image':
            return [
                slack_1.image(token.href, token.text || token.title || token.href, token.title || undefined),
            ];
        case 'space':
            return [];
        default:
            console.warn('Unhandled token type:', token.type);
            return [];
    }
}
function parseBlocks(tokens, options = {}) {
    const resultBlocks = [];
    let currentRichTextElements = [];
    function finalizeRichText() {
        if (currentRichTextElements.length > 0) {
            resultBlocks.push(slack_1.richText(currentRichTextElements));
            currentRichTextElements = [];
        }
    }
    for (const token of tokens) {
        const parsed = parseToken(token, options);
        if (parsed.length > 0) {
            const firstElement = parsed[0];
            if ('type' in firstElement &&
                (firstElement.type === 'rich_text_section' ||
                    firstElement.type === 'rich_text_list' ||
                    firstElement.type === 'rich_text_preformatted' ||
                    firstElement.type === 'rich_text_quote')) {
                currentRichTextElements.push(...parsed);
            }
            else {
                finalizeRichText();
                resultBlocks.push(...parsed);
            }
        }
        else if (token.type === 'space' && currentRichTextElements.length > 0) {
            finalizeRichText();
        }
    }
    finalizeRichText();
    return resultBlocks;
}
exports.parseBlocks = parseBlocks;
//# sourceMappingURL=internal.js.map