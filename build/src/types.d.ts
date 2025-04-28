export interface ParsingOptions {
    lists?: ListOptions;
    escapeSlack?: boolean;
}
export interface ListOptions {
    checkboxPrefix?: (checked: boolean) => string;
}
