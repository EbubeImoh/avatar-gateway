declare module "sql.js" {
  export type SqlValue = string | number | null | Uint8Array;
  export interface SqlJsStatement {
    bind(values?: SqlValue[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): boolean;
  }
  export interface SqlJsDatabase {
    prepare(sql: string): SqlJsStatement;
    exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
    export(): Uint8Array;
    getRowsModified(): number;
    close(): void;
  }
  const initSqlJs: (options?: { wasmBinary?: Uint8Array; locateFile?: (file: string) => string }) => Promise<{
    Database: new (data?: Uint8Array) => SqlJsDatabase;
  }>;
  export default initSqlJs;
}
