import type {
  DividerBlock,
  HeaderBlock,
  ImageBlock,
  SectionBlock,
  RichTextBlock,
  RichTextElement,
  RichTextBlockElement,
  RichTextSection,
  RichTextList,
} from '@slack/types';

const MAX_TEXT_LENGTH = 3000;
const MAX_HEADER_LENGTH = 150;
const MAX_IMAGE_TITLE_LENGTH = 2000;
const MAX_IMAGE_ALT_TEXT_LENGTH = 2000;

export function section(
  text: string,
  {splitParagraphs = false}: {splitParagraphs?: boolean} = {}
): SectionBlock[] {
  const blocks: SectionBlock[] = [];
  const paragraphs = splitParagraphs
    ? text.split(/\n{2,}/).filter(p => p.length > 0)
    : [text];

  for (const paragraph of paragraphs) {
    let remainingText = paragraph;
    while (remainingText.length > 0) {
      let chunk: string;
      if (remainingText.length <= MAX_TEXT_LENGTH) {
        chunk = remainingText;
        remainingText = '';
      } else {
        // Find the last space or newline before MAX_TEXT_LENGTH
        const potentialSplitPoint = MAX_TEXT_LENGTH;
        let splitPoint = remainingText.lastIndexOf(' ', potentialSplitPoint);
        const lastNewline = remainingText.lastIndexOf(
          '\n',
          potentialSplitPoint
        );
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

export function divider(): DividerBlock {
  return {
    type: 'divider',
  };
}

export function header(text: string): HeaderBlock {
  return {
    type: 'header',
    text: {
      type: 'plain_text',
      text: text.slice(0, MAX_HEADER_LENGTH),
    },
  };
}

export function image(
  url: string,
  altText: string,
  title?: string
): ImageBlock {
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

// Helper for creating a top-level rich_text block
export function richText(elements: RichTextBlockElement[]): RichTextBlock {
  return {
    type: 'rich_text',
    elements,
  };
}

// Helper for creating a rich_text_list element
export function richTextList(
  elements: RichTextSection[],
  style: 'bullet' | 'ordered',
  indent: number
): RichTextList {
  return {
    type: 'rich_text_list',
    elements,
    style,
    indent,
  };
}

// Helper for creating a rich_text_section element
export function richTextSection(elements: RichTextElement[]): RichTextSection {
  return {
    type: 'rich_text_section',
    elements,
  };
}
