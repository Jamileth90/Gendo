# Gendo

Descubre eventos, conciertos, mercados y cosas que hacer en **Cedar Rapids, Iowa**. Eventos gratis y de pago, música en vivo, festivales, comida y más.

## Características

- 🗺️ Mapa interactivo con eventos por ubicación
- 📅 Eventos destacados y recomendaciones personalizadas
- 🔍 Búsqueda por categoría, fecha y ciudad
- 📍 Vista por viewport del mapa (sin radio manual)
- 🌟 Eventos semanales recurrentes (mercados, ferias)
- 📱 Diseño responsive con vista tipo teléfono

## Requisitos

- Node.js 18+
- npm o pnpm

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/jamileth90/Gendo.git
cd Gendo

# Instalar dependencias
npm install

# Crear archivo .env (opcional, para APIs externas)
# cp .env.example .env
```

## Desarrollo local

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en el navegador.

La app usa SQLite local (`gendo.db`). Si no existe, se creará al ejecutar. Para cargar eventos de Cedar Rapids, usa los scripts en `scripts/` (ver `docs/GUIA-IMPORTAR-CIUDADES.md`).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Vista previa del build |

## Despliegue en Vercel

Gendo está configurado para Vercel. Consulta la guía completa:

📖 **[docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md)**

Resumen rápido:
1. Conecta el repo en [vercel.com](https://vercel.com)
2. Configura Turso para la base de datos
3. Añade las variables de entorno

## Estructura del proyecto

```
Gendo/
├── src/
│   ├── lib/          # Componentes, utilidades, DB
│   ├── routes/       # Páginas y APIs
│   └── app.html
├── scripts/          # Scrapers e importadores
├── docs/             # Guías
└── static/
```

## Licencia

Proyecto privado.
