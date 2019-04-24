import * as dedent from 'dedent-js';

export const gqlFmt = (templateStrings: TemplateStringsArray | string, ...values: any[]) =>
  `${dedent(templateStrings, ...values)}\n`;
