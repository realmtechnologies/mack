import {
  DividerBlock,
  HeaderBlock,
  ImageBlock,
  KnownBlock,
  SectionBlock,
  RichTextBlockElement,
  RichTextSection,
  RichTextElement,
  RichTextList,
} from '@slack/types';
import {ParsingOptions, MarkdownToBlocksResult} from '../types';
import {
  section,
  divider,
  header,
  image,
  richText,
  richTextList,
  richTextSection,
} from '../slack';
import marked from 'marked';
import {XMLParser} from 'fast-xml-parser';

type PhrasingToken =
  | marked.Tokens.Link
  | marked.Tokens.Em
  | marked.Tokens.Strong
  | marked.Tokens.Del
  | marked.Tokens.Br
  | marked.Tokens.Image
  | marked.Tokens.Codespan
  | marked.Tokens.Text
  | marked.Tokens.HTML;

type SlackRichTextContentElement = RichTextElement;

function parsePlainText(element: PhrasingToken): string[] {
  switch (element.type) {
    case 'link':
    case 'em':
    case 'strong':
    case 'del':
      return element.tokens.flatMap(child =>
        parsePlainText(child as PhrasingToken)
      );

    case 'br':
      return [];

    case 'image':
      return [element.title ?? element.href];

    case 'codespan':
    case 'text':
    case 'html':
      return [element.raw];
  }
}

function isSectionBlock(block: KnownBlock): block is SectionBlock {
  return block.type === 'section';
}

function escapeForSlack(text: string, escape: boolean): string {
  if (!escape) return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseMrkdwnRichText(
  element: PhrasingToken,
  options?: ParsingOptions
): SlackRichTextContentElement[] {
  const shouldEscape = options?.escapeSlack !== false;

  switch (element.type) {
    case 'link': {
      const textContent =
        element.tokens?.map(t => t.raw).join('') || element.text;
      return [{type: 'link', url: element.href, text: textContent}];
    }
    case 'image':
      return [
        {type: 'text', text: element.title || element.text || element.href},
      ];
    case 'em': {
      const children =
        element.tokens?.flatMap(child =>
          parseMrkdwnRichText(child as PhrasingToken, options)
        ) ?? [];
      return children.map(child => ({
        ...child,
        style: {...('style' in child ? child.style : {}), italic: true},
      }));
    }
    case 'codespan':
      return [{type: 'text', text: `\`${element.text}\``}];
    case 'strong': {
      const children =
        element.tokens?.flatMap(child =>
          parseMrkdwnRichText(child as PhrasingToken, options)
        ) ?? [];
      return children.map(child => ({
        ...child,
        style: {...('style' in child ? child.style : {}), bold: true},
      }));
    }
    case 'del': {
      const children =
        element.tokens?.flatMap(child =>
          parseMrkdwnRichText(child as PhrasingToken, options)
        ) ?? [];
      return children.map(child => ({
        ...child,
        style: {...('style' in child ? child.style : {}), strike: true},
      }));
    }
    case 'text': {
      const textToUse = escapeForSlack(element.text, shouldEscape);
      return [{type: 'text', text: textToUse}];
    }
    case 'html': {
      const htmlTextToUse = escapeForSlack(element.text, shouldEscape);
      return [{type: 'text', text: htmlTextToUse}];
    }
    case 'br':
      return [{type: 'text', text: '\n'}];
    default:
      return [];
  }
}

function parseListItemContents(
  tokens: marked.Token[],
  options?: ParsingOptions
): SlackRichTextContentElement[] {
  const elements: SlackRichTextContentElement[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        if (token.tokens) {
          elements.push(
            ...token.tokens.flatMap(t =>
              parseMrkdwnRichText(t as PhrasingToken, options)
            )
          );
        } else {
          elements.push(
            ...parseMrkdwnRichText(token as PhrasingToken, options)
          );
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
        elements.push(...parseMrkdwnRichText(token as PhrasingToken, options));
        break;
      case 'paragraph':
        if (token.tokens) {
          elements.push(
            ...token.tokens.flatMap(t =>
              parseMrkdwnRichText(t as PhrasingToken, options)
            )
          );
          elements.push({type: 'text', text: '\n'});
        }
        break;
      case 'space':
        break;
      default:
        console.warn(
          'Unsupported token type in list item content:',
          token.type
        );
    }
  }

  return elements.filter(
    elem =>
      !(
        elem.type === 'text' &&
        typeof elem.text === 'string' &&
        elem.text === '' &&
        !elem.style
      )
  );
}

function phrasingTokensToMrkdwnString(
  tokens: PhrasingToken[],
  options?: ParsingOptions
): string {
  const shouldEscape = options?.escapeSlack !== false;
  let mrkdwn = '';
  for (const token of tokens) {
    switch (token.type) {
      case 'link': {
        const linkContent = (token.tokens as PhrasingToken[]) ?? [];
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
        const strongContent = (token.tokens as PhrasingToken[]) ?? [];
        mrkdwn += `*${phrasingTokensToMrkdwnString(strongContent, options)}*`;
        break;
      }
      case 'em': {
        const emContent = (token.tokens as PhrasingToken[]) ?? [];
        mrkdwn += `_${phrasingTokensToMrkdwnString(emContent, options)}_`;
        break;
      }
      case 'del': {
        const delContent = (token.tokens as PhrasingToken[]) ?? [];
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
        const raw = 'raw' in token ? (token as PhrasingToken).raw : '';
        if (raw) {
          const escapedRaw = escapeForSlack(raw, shouldEscape);
          mrkdwn += escapedRaw;
        }
      }
    }
  }
  return mrkdwn;
}

function parseParagraph(
  element: marked.Tokens.Paragraph,
  options: ParsingOptions
): KnownBlock[] {
  const accumulator: (SectionBlock | ImageBlock)[] = [];
  let currentPhrasingTokens: PhrasingToken[] = [];

  const flushPhrasingTokens = () => {
    if (currentPhrasingTokens.length > 0) {
      const mrkdwnText = phrasingTokensToMrkdwnString(
        currentPhrasingTokens,
        options
      ).trim();
      if (mrkdwnText) {
        for (const block of section(mrkdwnText, {splitParagraphs: true})) {
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
        accumulator.push(
          image(
            (token as marked.Tokens.Image).href,
            (token as marked.Tokens.Image).text ||
              (token as marked.Tokens.Image).title ||
              (token as marked.Tokens.Image).href,
            (token as marked.Tokens.Image).title || undefined
          )
        );
        break;
      case 'space':
        currentPhrasingTokens.push({
          type: 'text',
          raw: ' ',
          text: ' ',
        } as marked.Tokens.Text);
        break;
      case 'text':
      case 'link':
      case 'strong':
      case 'em':
      case 'del':
      case 'codespan':
      case 'br':
      case 'html':
        currentPhrasingTokens.push(token as PhrasingToken);
        break;
      default:
        break;
    }
  }

  flushPhrasingTokens();

  return accumulator;
}

function parseHeading(element: marked.Tokens.Heading): HeaderBlock {
  return header(
    element.tokens
      .flatMap(child => parsePlainText(child as PhrasingToken))
      .join('')
  );
}

function parseCode(element: marked.Tokens.Code): SectionBlock[] {
  const accumulator: SectionBlock[] = [];
  for (const block of section(`\`\`\`\n${element.text}\n\`\`\``)) {
    accumulator.push(block);
  }
  return accumulator;
}

function parseList(
  element: marked.Tokens.List,
  options: ParsingOptions = {},
  indent = 0
): RichTextBlockElement[] {
  const result: RichTextBlockElement[] = [];
  let currentLevelSections: RichTextSection[] = [];

  function flushCurrentLevelSections() {
    if (currentLevelSections.length > 0) {
      const style = element.ordered ? 'ordered' : 'bullet';
      result.push(richTextList(currentLevelSections, style, indent));
      currentLevelSections = [];
    }
  }

  for (const item of element.items) {
    const itemContentTokens: marked.Token[] = [];
    const itemNestedLists: marked.Tokens.List[] = [];

    // Separate content and nested lists
    for (const token of item.tokens) {
      if (token.type === 'list') {
        itemNestedLists.push(token as marked.Tokens.List);
      } else {
        itemContentTokens.push(token);
      }
    }

    const contentElements = parseListItemContents(itemContentTokens, options);

    // Always add the content section (if any) to the current buffer first.
    if (contentElements.length > 0) {
      currentLevelSections.push(richTextSection(contentElements));
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

function parseTableRow(
  row: marked.Tokens.TableCell[],
  options: ParsingOptions
): SlackRichTextContentElement[][] {
  const parsedCells: SlackRichTextContentElement[][] = [];
  row.forEach(cell => {
    parsedCells.push(parseTableCell(cell, options));
  });
  return parsedCells;
}

function parseTableCell(
  cell: marked.Tokens.TableCell,
  options: ParsingOptions
): SlackRichTextContentElement[] {
  // Parse phrasing tokens within the cell into Slack rich text elements
  const richTextElements = cell.tokens.flatMap(token =>
    parseMrkdwnRichText(token as PhrasingToken, options)
  );

  // Simple trim: remove leading/trailing empty/whitespace-only text elements
  let startIndex = 0;
  while (startIndex < richTextElements.length) {
    const elem = richTextElements[startIndex];
    if (
      elem.type === 'text' &&
      !elem.text.trim() &&
      !elem.style // Keep styled empty elements
    ) {
      startIndex++;
    } else {
      break;
    }
  }

  let endIndex = richTextElements.length - 1;
  while (endIndex >= startIndex) {
    const elem = richTextElements[endIndex];
    if (
      elem.type === 'text' &&
      !elem.text.trim() &&
      !elem.style // Keep styled empty elements
    ) {
      endIndex--;
    } else {
      break;
    }
  }

  return richTextElements.slice(startIndex, endIndex + 1);
}

// Helper to convert rich text elements to a plain string (simplified)
function richTextElementsToString(
  elements: SlackRichTextContentElement[]
): string {
  return elements
    .map(el => {
      if (el.type === 'text') return el.text;
      if (el.type === 'link') return el.text || el.url;
      if (el.type === 'emoji') return `:${el.name}:`;
      // Add other element types as needed
      return '';
    })
    .join('');
}

// Define the structured result type for parseTable
type ParsedTableResult =
  | {type: 'blocks'; value: KnownBlock[]}
  | {type: 'tableArray'; value: string[][]}
  | {type: 'tableCellsAsRichTextSections'; value: RichTextSection[]};

function parseTable(
  element: marked.Tokens.Table,
  options: ParsingOptions
): ParsedTableResult {
  // Updated return type
  const headerRichTextCells = parseTableRow(element.header, options);
  const numCols = headerRichTextCells.length;

  // --- BEGIN 2-COLUMN HANDLING --- (Adapted for Rich Text)
  if (
    numCols === 2 &&
    element.rows.length < 8 &&
    options.extractTables !== 'list'
  ) {
    // Added check for extractTables !== 'list'
    const blocks: KnownBlock[] = [];
    const headerStrings = headerRichTextCells.map(richTextElementsToString);

    if (headerStrings.length === 2) {
      blocks.push({
        type: 'section',
        fields: [
          {type: 'mrkdwn', text: `*${headerStrings[0]}*`},
          {type: 'mrkdwn', text: `*${headerStrings[1]}*`},
        ],
      });
      if (element.rows.length) {
        blocks.push(divider());
      }
    }

    element.rows.forEach(row => {
      const dataRichTextCells = parseTableRow(row, options);
      const dataStrings = dataRichTextCells.map(richTextElementsToString);
      if (dataStrings.length === 2) {
        blocks.push({
          type: 'section',
          fields: [
            {type: 'mrkdwn', text: dataStrings[0]},
            {type: 'mrkdwn', text: dataStrings[1]},
          ],
        });
      }
    });

    return {type: 'blocks', value: blocks}; // Return structured type
  }
  // --- END 2-COLUMN HANDLING ---

  const parseRowsToStringArray = (): string[][] => {
    const headerStrings = headerRichTextCells.map(richTextElementsToString);
    const dataRowsStrings = element.rows.map(row => {
      const richTextRow = parseTableRow(row, options);
      return richTextRow.map(richTextElementsToString);
    });
    return [headerStrings, ...dataRowsStrings];
  };

  const parseRowsToAsciiTable = (): KnownBlock[] => {
    const headerStrings = headerRichTextCells.map(richTextElementsToString);
    const dataRowsStrings = element.rows.map(row => {
      const richTextRow = parseTableRow(row, options);
      return richTextRow.map(richTextElementsToString);
    });
    const allRows = [headerStrings, ...dataRowsStrings];

    if (allRows.length === 0 || allRows[0].length === 0) {
      return [];
    }

    const colWidths: number[] = new Array(numCols).fill(0);

    for (const row of allRows) {
      for (let i = 0; i < numCols; i++) {
        const cellContent = row[i] || '';
        colWidths[i] = Math.max(colWidths[i], cellContent.length);
      }
    }

    const formatRow = (row: string[], separator: string): string => {
      const paddedCells = row.map((cell, i) =>
        (cell || '').padEnd(colWidths[i])
      );
      return `${separator} ${paddedCells.join(` ${separator} `)} ${separator}`;
    };

    const createSeparator = (
      left: string,
      middle: string,
      right: string,
      line: string
    ): string => {
      const parts = colWidths.map(width => line.repeat(width + 2));
      return `${left}${parts.join(middle)}${right}`;
    };

    const topBorder = createSeparator('┌', '┬', '┐', '─');
    const headerSeparator = createSeparator('├', '┼', '┤', '─');
    const bottomBorder = createSeparator('└', '┴', '┘', '─');

    const asciiRows: string[] = [];
    asciiRows.push(topBorder);
    asciiRows.push(formatRow(headerStrings, '│'));
    asciiRows.push(headerSeparator);
    dataRowsStrings.forEach(row => {
      asciiRows.push(formatRow(row, '│'));
    });
    asciiRows.push(bottomBorder);

    const asciiTableString = asciiRows.join('\n');

    const accumulator: SectionBlock[] = [];
    for (const block of section(`\`\`\`\n${asciiTableString}\n\`\`\``)) {
      accumulator.push(block);
    }
    return accumulator;
  };

  const parseRowsToRichTextList = (): RichTextSection[] => {
    return element.rows.map(row => {
      const parsedDataRowCells = parseTableRow(row, options);
      const combinedRowElements: SlackRichTextContentElement[] = [];

      parsedDataRowCells.forEach((dataCellElements, cellIdx) => {
        if (headerRichTextCells[cellIdx]) {
          combinedRowElements.push(
            ...headerRichTextCells[cellIdx].map(el => ({
              ...el,
              style: {...(el.style || {}), bold: true},
            }))
          );
          combinedRowElements.push({
            type: 'text' as const,
            text: ': ',
            style: {bold: true},
          });
        }

        combinedRowElements.push(...dataCellElements);
        combinedRowElements.push({type: 'text' as const, text: '\n'});
      });
      combinedRowElements.push({type: 'text' as const, text: '\n\n'});

      return {
        type: 'rich_text_section' as const,
        elements: combinedRowElements.filter(el => !('text' in el) || el.text),
      };
    });
  };

  if (options.extractTables === 'list') {
    const elements = parseRowsToRichTextList();
    return {type: 'blocks', value: [{type: 'rich_text' as const, elements}]};
  } else if (options.extractTables === true) {
    // Check for boolean true
    return {type: 'tableArray', value: parseRowsToStringArray()}; // Return structured type
  } else {
    // Default to ASCII table if extractTables is false or undefined
    return {type: 'blocks', value: parseRowsToAsciiTable()}; // Return structured type
  }
}

function parseBlockquote(
  element: marked.Tokens.Blockquote,
  options: ParsingOptions
): KnownBlock[] {
  return element.tokens
    .filter(
      (child): child is marked.Tokens.Paragraph => child.type === 'paragraph'
    )
    .flatMap(p =>
      parseParagraph(p, options).map(block => {
        if (isSectionBlock(block) && block.text?.text?.includes('\n'))
          block.text.text = '> ' + block.text.text.replace(/\n/g, '\n> ');
        return block;
      })
    );
}

function parseThematicBreak(): DividerBlock {
  return divider();
}

function parseHTML(
  element: marked.Tokens.HTML | marked.Tokens.Tag
): KnownBlock[] {
  const parser = new XMLParser({ignoreAttributes: false});
  const res = parser.parse(element.raw);

  if (res.img) {
    const tags = res.img instanceof Array ? res.img : [res.img];

    return tags
      .map((img: Record<string, string>) => {
        const url: string = img['@_src'];
        return image(url, img['@_alt'] || url);
      })
      .filter((e: Record<string, string>) => !!e);
  } else return [];
}

// Update the structured result type for parseToken
type StructuredTokenParseResult =
  | {type: 'blocks'; value: KnownBlock[]}
  | {type: 'richtext'; value: RichTextBlockElement[]}
  | {type: 'tableArray'; value: string[][]};

function parseToken(
  token: marked.Token,
  options: ParsingOptions
): StructuredTokenParseResult {
  switch (token.type) {
    case 'heading':
      return {
        type: 'blocks',
        value: [parseHeading(token as marked.Tokens.Heading)],
      };

    case 'paragraph':
      return {
        type: 'blocks',
        value: parseParagraph(token as marked.Tokens.Paragraph, options),
      };

    case 'code':
      return {type: 'blocks', value: parseCode(token as marked.Tokens.Code)};

    case 'blockquote':
      return {
        type: 'blocks',
        value: parseBlockquote(token as marked.Tokens.Blockquote, options),
      };

    case 'list':
      return {
        type: 'richtext',
        value: parseList(token as marked.Tokens.List, options),
      };

    case 'table': {
      const parsed = parseTable(token as marked.Tokens.Table, options);
      switch (parsed.type) {
        case 'blocks':
          return {type: 'blocks', value: parsed.value};
        case 'tableArray':
          return {type: 'tableArray', value: parsed.value};
        default:
          return {type: 'blocks', value: []};
      }
    }

    case 'hr':
      return {type: 'blocks', value: [parseThematicBreak()]};

    case 'html':
      return {type: 'blocks', value: parseHTML(token as marked.Tokens.HTML)};

    case 'image':
      return {
        type: 'blocks',
        value: [
          image(
            token.href,
            token.text || token.title || token.href,
            token.title || undefined
          ),
        ],
      };

    case 'space':
      return {type: 'blocks', value: []}; // Represent no-op clearly

    default:
      console.warn('Unhandled token type:', token.type);
      return {type: 'blocks', value: []}; // Represent no-op clearly
  }
}

export function parseBlocks(
  tokens: marked.TokensList,
  options: ParsingOptions = {}
): MarkdownToBlocksResult {
  const resultBlocks: KnownBlock[] = [];
  const extractedTables: string[][][] = [];
  let currentRichTextElements: RichTextBlockElement[] = [];

  function finalizeRichText() {
    if (currentRichTextElements.length > 0) {
      resultBlocks.push(richText(currentRichTextElements));
      currentRichTextElements = [];
    }
  }

  // Define the type within the function scope or ensure it's accessible
  type StructuredTokenParseResult =
    | {type: 'blocks'; value: KnownBlock[]}
    | {type: 'richtext'; value: RichTextBlockElement[]}
    | {type: 'tableArray'; value: string[][]};

  for (const token of tokens) {
    const parsed: StructuredTokenParseResult = parseToken(token, options);

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
