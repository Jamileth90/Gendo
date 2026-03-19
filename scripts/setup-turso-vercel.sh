#!/usr/bin/env bash
# Setup Turso para Gendo en Vercel
# Ejecuta: bash scripts/setup-turso-vercel.sh

set -e
TURSO_BIN="${TURSO_BIN:-$HOME/.turso/turso}"

echo "🔐 1. Iniciar sesión en Turso (abre el navegador)..."
"$TURSO_BIN" auth login

echo ""
echo "📦 2. Crear base de datos 'gendo' en Turso..."
"$TURSO_BIN" db create gendo --region iowa 2>/dev/null || echo "   (ya existe, continuando...)"

echo ""
echo "🔗 3. Obtener URL y token..."
URL=$("$TURSO_BIN" db show gendo --url 2>/dev/null | tail -1)
TOKEN=$("$TURSO_BIN" db tokens create gendo 2>/dev/null | tail -1)

if [ -z "$URL" ] || [ -z "$TOKEN" ]; then
  echo "❌ No se pudo obtener URL o token. Verifica que la base 'gendo' exista."
  exit 1
fi

echo ""
echo "✅ Variables para Vercel:"
echo ""
echo "   TURSO_DATABASE_URL=$URL"
echo "   TURSO_AUTH_TOKEN=$TOKEN"
echo ""
echo "📋 Pasos en Vercel:"
echo "   1. Ve a https://vercel.com → tu proyecto Gendo"
echo "   2. Settings → Environment Variables"
echo "   3. Añade TURSO_DATABASE_URL y TURSO_AUTH_TOKEN (Production + Preview)"
echo "   4. Redeploy el proyecto"
echo ""

# Migrar datos si existe gendo.db
if [ -f "gendo.db" ]; then
  echo "📤 4. Migrar datos desde gendo.db..."
  sqlite3 gendo.db .dump 2>/dev/null | "$TURSO_BIN" db shell gendo 2>/dev/null && echo "   ✅ Datos migrados" || echo "   ⚠️  Migración manual: sqlite3 gendo.db .dump | turso db shell gendo"
else
  echo "📤 4. No hay gendo.db local. Las tablas se crearán al usar la app."
fi

echo ""
echo "✨ Listo. Configura las variables en Vercel y redeploy."
