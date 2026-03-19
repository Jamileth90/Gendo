/**
 * Limpieza automática: borra eventos cuya fecha ya pasó.
 * Gendo debe verse siempre con información del futuro.
 */
import { all, get, run, exec } from '$lib/db/client';

const THROTTLE_HOURS = 6;

export async function cleanupPastEvents(): Promise<number> {
	const now = Math.floor(Date.now() / 1000);

	// Tabla para throttling: solo ejecutar cada THROTTLE_HOURS
	await exec(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value INTEGER)`);
	const lastRun = await get<{ value: number }>('SELECT value FROM _meta WHERE key = ?', 'last_cleanup');
	if (lastRun && now - lastRun.value < THROTTLE_HOURS * 3600) {
		return 0;
	}

	// Borrar eventos cuya fecha de fin (o inicio si no hay fin) ya pasó
	const result = await run(
		`DELETE FROM events WHERE status = 'active' AND COALESCE(date_end, date_start) < ?`,
		now
	);

	await run(
		`INSERT INTO _meta (key, value) VALUES ('last_cleanup', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		now
	);

	return result.changes;
}
