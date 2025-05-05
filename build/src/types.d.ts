export interface ParsingOptions {
    lists?: ListOptions;
    escapeSlack?: boolean;
    extractTables?: boolean | 'list';
}
export interface ListOptions {
    checkboxPrefix?: (checked: boolean) => string;
}
export interface MarkdownToBlocksResult {
    blocks: import('@slack/types').KnownBlock[];
    tables?: string[][][];
}
