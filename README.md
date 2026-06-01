# ReelFlow — Frontend Scaffold

Panel de publicación y edición de reels para Instagram y TikTok.

## Estructura del proyecto

```
reelflow/
├── index.html                  ← Punto de entrada principal
├── README.md
└── src/
    ├── assets/
    │   └── app.js              ← Toda la lógica frontend
    └── styles/
        ├── variables.css       ← Design tokens / CSS variables
        ├── base.css            ← Reset y tipografía
        ├── layout.css          ← Sidebar, topbar, grillas
        ├── components.css      ← Botones, cards, forms, modals
        ├── pages.css           ← Estilos específicos por página
        └── animations.css      ← Keyframes y animaciones
```

## Páginas incluidas

- **Dashboard** — Estadísticas y resumen de actividad
- **Cuentas** — Conexión OAuth de Instagram y TikTok
- **Publicar** — Subida y publicación de reels
- **Editor** — Selector de 15 templates virales + generación
- **Historial** — Log de publicaciones y formatos
- **Configuración** — Backend URL, API keys, tokens

## Variables de entorno (para el backend)

Para Vercel, configurar estas variables en:
`Project > Settings > Environment Variables`.

```env
INSTAGRAM_APP_ID=1428803625601557
INSTAGRAM_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
CREATOMATE_API_KEY=
BACKEND_URL=https://reelflow-topaz.vercel.app
```

## Callback URLs para registrar en las apps

```
Instagram: https://reelflow-topaz.vercel.app/auth/instagram/callback
TikTok:    https://reelflow-topaz.vercel.app/auth/tiktok/callback
Data deletion: https://reelflow-topaz.vercel.app/eliminacion-datos.html
```

## Uso sin backend

El frontend funciona de forma standalone para desarrollo visual.
Los tokens y cuentas se guardan en `localStorage`.
Las publicaciones y generaciones simulan el flujo pero necesitan el backend para ejecutarse realmente.

## Cloudflare Pages Functions

La ruta `functions/api/instagram/exchange.js` crea el endpoint:

```
/api/instagram/exchange
```

Ese endpoint recibe el `code` de Instagram, usa `INSTAGRAM_APP_SECRET` de forma privada y devuelve los datos de la cuenta conectada.

## Vercel Functions

La ruta `api/instagram/exchange.js` crea el mismo endpoint para Vercel:

```
/api/instagram/exchange
```

En Vercel, no pongas secretos en archivos del proyecto. Guardalos como Environment Variables.

La ruta `api/instagram/publish.js` publica un Reel desde una URL pública de video:

```
/api/instagram/publish
```

La ruta `api/tiktok/exchange.js` cambia el `code` OAuth de TikTok por tokens:

```
/api/tiktok/exchange
```

La ruta `api/tiktok/publish.js` publica con TikTok Direct Post usando una URL pública de video:

```
/api/tiktok/publish
```

Para Direct Post, el OAuth de TikTok debe pedir el scope:

```env
user.info.basic,video.publish
```

Si se usa `PULL_FROM_URL`, TikTok puede exigir verificar el dominio público del video en el portal de Developers.

La ruta `api/blob/upload.js` habilita uploads directos de video a Vercel Blob:

```
/api/blob/upload
```

Para usar uploads, el proyecto de Vercel necesita la variable:

```env
BLOB_READ_WRITE_TOKEN=
```

Diagnostico rapido:

```
/api/blob/status
/api/blob/test
```

## Stack recomendado para el backend

- **Runtime:** Node.js + Express
- **Video:** FFmpeg + Creatomate API
- **Storage:** AWS S3 / Cloudflare R2
- **DB:** PostgreSQL (cuentas, tokens, historial)
- **Deploy:** Railway / Render
