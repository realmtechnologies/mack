export interface ParsingOptions {
  // Configure how lists are displayed
  lists?: ListOptions;
  // Configure if slack-specific characters should be escaped
  escapeSlack?: boolean;
}

export interface ListOptions {
  // Configure how checkbox list items are displayed. By default, they are prefixed with '* '
  checkboxPrefix?: (checked: boolean) => string;
}
