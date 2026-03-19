# Guía de despliegue en Vercel

Gendo está configurado para desplegarse en **Vercel** de forma rápida. Esta guía te lleva paso a paso.

---

## 1. Crear cuenta en Vercel

Si aún no tienes cuenta:

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en **Sign Up**
3. Elige **Continue with GitHub** (recomendado para conectar tu repo)
4. Autoriza a Vercel para acceder a tus repositorios

---

## 2. Preparar el repositorio

Asegúrate de que Gendo esté en GitHub:

```bash
cd /Users/jamileth/Gendo
git init   # si no está inicializado
git add .
git commit -m "Prepare for Vercel deploy"
git remote add origin https://github.com/TU_USUARIO/gendo.git   # cambia TU_USUARIO
git push -u origin main
```

---

## 3. Conectar el proyecto en Vercel

1. En [vercel.com/dashboard](https://vercel.com/dashboard), haz clic en **Add New** → **Project**
2. Importa el repositorio **Gendo** desde GitHub
3. Vercel detectará automáticamente que es un proyecto SvelteKit
4. **Framework Preset**: SvelteKit (ya detectado)
5. **Root Directory**: `./` (dejar por defecto)
6. **Build Command**: `npm run build` (por defecto)
7. Haz clic en **Deploy**

El primer deploy puede tardar 1–2 minutos.

---

## 4. Base de datos (Turso)

Vercel usa funciones serverless sin disco persistente. Por eso Gendo necesita una base de datos en la nube. La opción más sencilla y compatible con SQLite es **Turso**.

### 4.1 Crear base de datos en Turso

1. Ve a [turso.tech](https://turso.tech) y crea una cuenta (gratis)
2. Instala el CLI de Turso:
   ```bash
   brew install tursodatabase/tap/turso   # macOS
   ```
3. Inicia sesión:
   ```bash
   turso auth login
   ```
4. Crea la base de datos:
   ```bash
   turso db create gendo --region iowa
   ```
5. Obtén la URL y el token:
   ```bash
   turso db show gendo --url
   turso db tokens create gendo
   ```

### 4.2 Migrar datos desde SQLite local

Si ya tienes `gendo.db` con eventos:

```bash
# Exportar el schema y datos
sqlite3 gendo.db .dump > gendo_dump.sql

# Crear tablas en Turso (Turso usa libsql, compatible con SQLite)
turso db shell gendo < gendo_dump.sql
```

O usa el CLI de Turso para importar:

```bash
turso db shell gendo
# Dentro del shell, pega los comandos CREATE TABLE e INSERT de tu dump
```

### 4.3 Variables de entorno en Vercel

1. En el proyecto de Vercel: **Settings** → **Environment Variables**
2. Añade:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `TURSO_DATABASE_URL` | `libsql://gendo-TU_ORG.turso.io` | Production, Preview |
| `TURSO_AUTH_TOKEN` | El token que generaste | Production, Preview |

3. Guarda y haz un **Redeploy** del proyecto.

---

## 5. Sin dominio propio

Por ahora puedes usar el subdominio que Vercel te asigna:

- **Producción**: `gendo-tu-usuario.vercel.app`
- **Preview** (cada push a ramas): `gendo-xxx-tu-usuario.vercel.app`

Cuando tengas un dominio, en Vercel: **Settings** → **Domains** → **Add** y sigue las instrucciones para configurar DNS.

---

## 6. Variables de entorno opcionales

| Variable | Descripción |
|----------|-------------|
| `APIFY_TOKEN` | Para la API de Discover (eventos por ubicación). Obtener en [apify.com](https://apify.com) |
| `OPENAI_API_KEY` | Si usas funciones con IA (opcional) |

---

## 7. Resumen rápido

1. Crear cuenta en Vercel
2. Conectar repo de GitHub
3. Crear base de datos en Turso y configurar `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`
4. Deploy automático en cada push a `main`

---

## Nota sobre la base de datos

Gendo usa una capa unificada de base de datos (`@libsql/client`):

- **Desarrollo local**: Si no hay `TURSO_DATABASE_URL`, usa SQLite local (`file:./gendo.db`).
- **Producción (Vercel)**: Con `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`, usa Turso. Los datos persisten en la nube.

La migración a Turso está completa. Solo necesitas crear la base de datos en Turso, migrar tus datos (si los tienes en `gendo.db`) y configurar las variables de entorno en Vercel.
