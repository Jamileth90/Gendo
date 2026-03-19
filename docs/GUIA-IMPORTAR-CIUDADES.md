# Guía: Cómo importar eventos para tus ciudades

Esta guía explica cómo añadir eventos de cualquier ciudad a Gendo. Las ciudades que ves en la app son las que tienen eventos en la base de datos.

---

## Opción 1: Archivo JSON (la más directa)

### Paso 1: Obtener datos de Facebook Events con Apify

1. Entra en [apify.com](https://apify.com) y crea una cuenta (tienen plan gratuito).
2. Busca el actor **"Facebook Events Scraper"** (por ejemplo: `apify/facebook-events-scraper`).
3. Configura la búsqueda:
   - **Search** o **Location**: escribe la ciudad que quieras
   - Ejemplos: `Des Moines, Iowa`, `Guayaquil`, `Madrid`, `Buenos Aires`
4. Ejecuta el scraper (Start) y espera a que termine.
5. En la pestaña **Export** → descarga como **JSON**.

### Paso 2: Guardar el archivo en tu proyecto

Guarda el JSON en la carpeta del proyecto, por ejemplo:

```
Gendo/
├── facebook-events.json      ← por defecto
├── des-moines-events.json    ← o con nombre de ciudad
├── guayaquil-events.json
└── ...
```

### Paso 3: Importar a Gendo

```bash
# Probar primero (no guarda nada, solo muestra qué se importaría):
node scripts/import-facebook-events.mjs tu-archivo.json --dry-run

# Importar de verdad:
node scripts/import-facebook-events.mjs tu-archivo.json
```

Si usas el nombre por defecto `facebook-events.json`:

```bash
node scripts/import-facebook-events.mjs
```

### Formato esperado del JSON

El script espera objetos con estos campos (como los de Apify Facebook Events):

| Campo | Ejemplo | Requerido |
|-------|---------|------------|
| `name` o `title` | "Concierto de Jazz" | Sí |
| `utcStartDate` o `startDate` | "2026-03-20T19:00:00.000Z" | Sí |
| `location.city` | "Des Moines" | Sí (o `location.name` con ciudad) |
| `location.name` | "Downtown Venue" | No |
| `url` | "https://facebook.com/events/..." | No (evita duplicados) |
| `imageUrl` | "https://..." | No |

---

## Opción 2: Apify API (automático)

Si tienes `APIFY_TOKEN` en tu archivo `.env`:

1. Ve a [Apify Console](https://console.apify.com/account/integrations) y copia tu token.
2. Añade en `.env`:
   ```
   APIFY_TOKEN=tu_token_aqui
   ```
3. Ejecuta en Apify el scraper de Facebook Events para la ciudad que quieras.
4. Cuando termine, copia el **Dataset ID** (aparece en la URL o en los detalles del run).
5. Ejecuta:

```bash
node scripts/import-apify-social.mjs --dataset=TU_DATASET_ID
```

Opciones adicionales:

```bash
# Limitar a 200 eventos
node scripts/import-apify-social.mjs --dataset=ID --limit=200

# Probar sin guardar
node scripts/import-apify-social.mjs --dataset=ID --dry-run
```

---

## Opción 3: Refresh completo (todas las fuentes)

El endpoint `/api/refresh-all` ejecuta todos los scripts de importación:

- Eventbrite
- Meetup.com
- Facebook (facebook-events.json)
- Instagram (instagram.json)
- Apify API (Facebook + Instagram de tu cuenta)
- Cedar Rapids (tourism, venues)

```bash
# Iniciar actualización (tarda 10–20 min)
curl -X POST http://localhost:5173/api/refresh-all

# Ver estado
curl http://localhost:5173/api/refresh-all
```

---

## Ejemplos por ciudad

| Ciudad | Búsqueda en Apify | Comando |
|--------|-------------------|---------|
| Des Moines, IA | `Des Moines, Iowa` | `node scripts/import-facebook-events.mjs des-moines.json` |
| Guayaquil | `Guayaquil, Ecuador` | `node scripts/import-facebook-events.mjs guayaquil.json` |
| Madrid | `Madrid, Spain` | `node scripts/import-facebook-events.mjs madrid.json` |
| Buenos Aires | `Buenos Aires, Argentina` | `node scripts/import-facebook-events.mjs buenos-aires.json` |

---

## Solución de problemas

### "No se encontró el archivo"
- Verifica la ruta del JSON.
- Usa ruta absoluta si hace falta: `node scripts/import-facebook-events.mjs /ruta/completa/archivo.json`

### "Sin ciudad" (skipped_no_city)
- El JSON no tiene `location.city` ni `location.name` con una ciudad.
- Revisa que cada evento tenga algo como `"location": { "city": "Des Moines" }` o `"location.name": "Venue, Des Moines, IA"`.

### "Falta APIFY_TOKEN"
- Solo aplica a `import-apify-social.mjs`.
- Crea `.env` en la raíz con `APIFY_TOKEN=tu_token`.

### Los eventos no aparecen en la app
- Reinicia el servidor si está corriendo.
- Verifica que el import terminó sin errores.
- Revisa en la base de datos: `sqlite3 gendo.db "SELECT name FROM cities;"`

---

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `import-facebook-events.mjs` | Importa eventos desde un JSON (Apify Facebook Events) |
| `import-apify-social.mjs` | Importa desde tu cuenta Apify (Facebook, Instagram) |
| `import-apify-cedar-rapids.mjs` | Venues/lugares de Google Places (solo Cedar Rapids) |
| `import-instagram-from-json.mjs` | Importa desde instagram.json |
