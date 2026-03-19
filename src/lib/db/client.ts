/**
 * Cliente de base de datos unificado: Turso (producción) o SQLite local (desarrollo).
 * Usa @libsql/client para ambos — compatible con Vercel serverless.
 */
import { createClient } from '@libsql/client';
import { join } from 'path';

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = (process.env.TURSO_AUTH_TOKEN ?? '')
	.trim()
	.replace(/^Bearer\s+/i, '');
const DB_PATH = process.env.DATABASE_URL ?? join(process.cwd(), 'gendo.db');

function getClient() {
	if (TURSO_URL) {
		return createClient({
			url: TURSO_URL,
			authToken: TURSO_TOKEN,
		});
	}
	// Local: SQLite file
	return createClient({
		url: `file:${DB_PATH}`,
	});
}

let _client: ReturnType<typeof createClient> | null = null;

function client() {
	if (!_client) _client = getClient();
	return _client;
}

export interface DbRunResult {
	changes: number;
	lastInsertRowid?: bigint;
}

/** Ejecuta SELECT y devuelve todas las filas */
export async function all<T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T[]> {
	const result = await client().execute({ sql, args: args as (string | number | null)[] });
	return result.rows as T[];
}

/** Ejecuta SELECT y devuelve la primera fila o null */
export async function get<T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T | null> {
	const rows = await all<T>(sql, ...args);
	return rows[0] ?? null;
}

/** Ejecuta INSERT/UPDATE/DELETE y devuelve el número de filas afectadas */
export async function run(sql: string, ...args: unknown[]): Promise<DbRunResult> {
	const result = await client().execute({ sql, args: args as (string | number | null)[] });
	return {
		changes: result.rowsAffected ?? 0,
		lastInsertRowid: result.lastInsertRowid,
	};
}

/** Ejecuta múltiples sentencias SQL (CREATE TABLE, etc.) */
export async function exec(sql: string): Promise<void> {
	const statements = sql
		.split(';')
		.map((s) => s.trim())
		.filter(Boolean);
	if (statements.length === 0) return;
	const c = client();
	for (const stmt of statements) {
		await c.execute({ sql: stmt.endsWith(';') ? stmt : stmt + ';', args: [] });
	}
}

export const db = { all, get, run, exec };
