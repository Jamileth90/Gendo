/**
 * Re-export del cliente unificado (Turso/SQLite).
 * Para compatibilidad con código que importaba getDb/Database.
 */
export { all, get, run, exec, db } from './client';
