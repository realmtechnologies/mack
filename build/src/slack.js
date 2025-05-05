"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.richTextSection = exports.richTextList = exports.richText = exports.image = exports.header = exports.divider = exports.section = void 0;
const MAX_TEXT_LENGTH = 3000;
const MAX_HEADER_LENGTH = 150;
const MAX_IMAGE_TITLE_LENGTH = 2000;
const MAX_IMAGE_ALT_TEXT_LENGTH = 2000;
function section(text, { splitParagraphs = false } = {}) {
    const blocks = [];
    const paragraphs = splitParagraphs
        ? text.split(/\n{2,}/).filter(p => p.length > 0)
        : [text];
    for (const paragraph of paragraphs) {
        let remainingText = paragraph;
        while (remainingText.length > 0) {
            let chunk;
            if (remainingText.length <= MAX_TEXT_LENGTH) {
                chunk = remainingText;
                remainingText = '';
            }
            else {
                // Find the last space or newline before MAX_TEXT_LENGTH
                const potentialSplitPoint = MAX_TEXT_LENGTH;
                let splitPoint = remainingText.lastIndexOf(' ', potentialSplitPoint);
                const lastNewline = remainingText.lastIndexOf('\n', potentialSplitPoint);
                splitPoint = Math.max(splitPoint, lastNewline);
                // If no space/newline found, or if it's at the beginning, force split at MAX_TEXT_LENGTH
                if (splitPoint <= 0) {
                    splitPoint = MAX_TEXT_LENGTH;
                }
                chunk = remainingText.slice(0, splitPoint);
                // Skip the space/newline itself when setting remainingText
                remainingText = remainingText.slice(splitPoint).trimStart();
            }
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: chunk,
                },
            });
        }
    }
    return blocks;
}
exports.section = section;
function divider() {
    return {
        type: 'divider',
    };
}
exports.divider = divider;
function header(text) {
    return {
        type: 'header',
        text: {
            type: 'plain_text',
            text: text.slice(0, MAX_HEADER_LENGTH),
        },
    };
}
exports.header = header;
function image(url, altText, title) {
    return {
        type: 'image',
        image_url: url,
        alt_text: altText.slice(0, MAX_IMAGE_ALT_TEXT_LENGTH),
        title: title
            ? {
                type: 'plain_text',
                text: title.slice(0, MAX_IMAGE_TITLE_LENGTH),
            }
            : undefined,
    };
}
exports.image = image;
// Helper for creating a top-level rich_text block
function richText(elements) {
    return {
        type: 'rich_text',
        elements,
    };
}
exports.richText = richText;
// Helper for creating a rich_text_list element
function richTextList(elements, style, indent) {
    return {
        type: 'rich_text_list',
        elements,
        style,
        indent,
    };
}
exports.richTextList = richTextList;
// Helper for creating a rich_text_section element
function richTextSection(elements) {
    return {
        type: 'rich_text_section',
        elements,
    };
}
exports.richTextSection = richTextSection;
//# sourceMappingURL=slack.js.map