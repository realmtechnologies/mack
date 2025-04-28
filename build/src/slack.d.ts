import type { DividerBlock, HeaderBlock, ImageBlock, SectionBlock, RichTextBlock, RichTextElement, RichTextBlockElement, RichTextSection, RichTextList } from '@slack/types';
export declare function section(text: string): SectionBlock[];
export declare function divider(): DividerBlock;
export declare function header(text: string): HeaderBlock;
export declare function image(url: string, altText: string, title?: string): ImageBlock;
export declare function richText(elements: RichTextBlockElement[]): RichTextBlock;
export declare function richTextList(elements: RichTextSection[], style: 'bullet' | 'ordered', indent: number): RichTextList;
export declare function richTextSection(elements: RichTextElement[]): RichTextSection;
