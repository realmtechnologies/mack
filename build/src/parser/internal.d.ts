import { ParsingOptions, MarkdownToBlocksResult } from '../types';
import marked from 'marked';
export declare function parseBlocks(tokens: marked.TokensList, options?: ParsingOptions): MarkdownToBlocksResult;
