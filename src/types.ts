export interface ParsingOptions {
  // Configure how lists are displayed
  lists?: ListOptions;
  // Configure if slack-specific characters should be escaped
  escapeSlack?: boolean;
  // Optionally extract tables into a separate array or a list format instead of rendering as code blocks
  extractTables?: boolean | 'list';
}

export interface ListOptions {
  // Configure how checkbox list items are displayed. By default, they are prefixed with '* '
  checkboxPrefix?: (checked: boolean) => string;
}

// Add the new result type
export interface MarkdownToBlocksResult {
  blocks: import('@slack/types').KnownBlock[];
  tables?: string[][][];
}
