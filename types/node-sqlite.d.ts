declare module "node:sqlite" {
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }
  export interface StatementSync {
    get(...anonymousParameters: any[]): any;
    all(...anonymousParameters: any[]): any[];
    run(...anonymousParameters: any[]): StatementResultingChanges;
  }
  export class DatabaseSync {
    constructor(path: string, options?: unknown);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}