# Variables de entorno para Vercel (Turso)

Añade estas variables en tu proyecto de Vercel:

**Settings → Environment Variables** → Add New

1. **TURSO_DATABASE_URL** = `libsql://gendo-jamileth90.aws-us-east-1.turso.io`  
   Entornos: Production, Preview

2. **TURSO_AUTH_TOKEN** = *(valor en `.env.vercel.values`)*  
   Entornos: Production, Preview

Después de añadirlas, haz **Redeploy** del proyecto en Vercel.
