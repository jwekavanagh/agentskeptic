declare module "mssql" {
  export interface ISqlType {}

  export const MAX: number;
  export function NVarChar(length: number): ISqlType;

  export interface IRequest {
    input(name: string, type: ISqlType, value: string): IRequest;
    query<T extends Record<string, unknown> = Record<string, unknown>>(
      command: string,
    ): Promise<{ recordset: T[] }>;
  }

  export class ConnectionPool {
    request(): IRequest;
    close(): Promise<void>;
  }

  interface MssqlStatic {
    connect(connectionString: string): Promise<ConnectionPool>;
    NVarChar: typeof NVarChar;
    MAX: typeof MAX;
  }

  const mssql: MssqlStatic;
  export default mssql;
}
