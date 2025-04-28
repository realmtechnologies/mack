import { KnownBlock } from '@slack/types';
import { ParsingOptions } from '../types';
import marked from 'marked';
export declare function parseBlocks(tokens: marked.TokensList, options?: ParsingOptions): KnownBlock[];
