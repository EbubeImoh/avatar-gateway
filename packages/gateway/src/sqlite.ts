import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import initSqlJs from "sql.js";

const require = createRequire(import.meta.url);
const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
const SqlJs = await initSqlJs({ wasmBinary: readFileSync(wasmPath), locateFile: () => wasmPath });

export interface StorageStatement<T extends unknown[] = unknown[], R = Record<string, unknown>> {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): R | undefined;
  all(...params: unknown[]): R[];
}

export interface StorageDatabase {
  exec(sql: string): void;
  pragma(sql: string): unknown;
  prepare<T extends unknown[] = unknown[], R = Record<string, unknown>>(sql: string): StorageStatement<T, R>;
  serialize(): Uint8Array;
  restore(snapshot: Uint8Array): void;
  flush(): void;
  close(): void;
}

function toSqlValue(value: unknown): string | number | null | Uint8Array {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Uint8Array) return value;
  return JSON.stringify(value);
}

export class SqlJsStorageDatabase implements StorageDatabase {
  private raw: InstanceType<typeof SqlJs.Database>;
  private readonly filePath: string;

  constructor(path = ":memory:", snapshot?: Uint8Array) {
    this.filePath = path;
    const initial = snapshot ?? (path !== ":memory:" && existsSync(path) ? readFileSync(path) : undefined);
    this.raw = new SqlJs.Database(initial ? Uint8Array.from(initial) : undefined);
  }

  exec(sql: string): void { this.raw.exec(sql); }

  pragma(sql: string): unknown {
    const result = this.raw.exec(`PRAGMA ${sql}`)[0];
    if (!result) return undefined;
    return result.values.map((row) => Object.fromEntries(result.columns.map((name, index) => [name, row[index]])));
  }

  prepare<T extends unknown[] = unknown[], R = Record<string, unknown>>(sql: string): StorageStatement<T, R> {
    const database = this.raw;
    return {
      run(...params: unknown[]) {
        const statement = database.prepare(sql);
        try {
          if (params.length) statement.bind(params.map(toSqlValue));
          while (statement.step()) { /* consume RETURNING rows as well as ordinary writes */ }
          const rows = database.exec("SELECT last_insert_rowid() AS id");
          return {
            changes: database.getRowsModified(),
            lastInsertRowid: Number(rows[0]?.values[0]?.[0] ?? 0),
          };
        } finally { statement.free(); }
      },
      get(...params: unknown[]) {
        const statement = database.prepare(sql);
        try {
          if (params.length) statement.bind(params.map(toSqlValue));
          return statement.step() ? statement.getAsObject() as R : undefined;
        } finally { statement.free(); }
      },
      all(...params: unknown[]) {
        const statement = database.prepare(sql);
        const result: R[] = [];
        try {
          if (params.length) statement.bind(params.map(toSqlValue));
          while (statement.step()) result.push(statement.getAsObject() as R);
          return result;
        } finally { statement.free(); }
      },
    };
  }

  serialize(): Uint8Array { return this.raw.export(); }

  restore(snapshot: Uint8Array): void {
    this.raw.close();
    this.raw = new SqlJs.Database(Uint8Array.from(snapshot));
  }

  flush(): void {
    if (this.filePath === ":memory:") return;
    const path = resolve(this.filePath);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.${process.pid}.tmp`;
    writeFileSync(temporary, this.raw.export(), { mode: 0o600 });
    renameSync(temporary, path);
    chmodSync(path, 0o600);
  }

  close(): void {
    this.flush();
    this.raw.close();
  }
}

export function createSqlJsDatabase(path = ":memory:", snapshot?: Uint8Array): StorageDatabase {
  return new SqlJsStorageDatabase(path, snapshot);
}
