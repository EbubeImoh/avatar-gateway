declare module "jsdom" {
  export class JSDOM {
    readonly window: {
      document: Document;
      close(): void;
    };
    constructor(html?: string);
  }
}
