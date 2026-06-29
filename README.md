# ReelFlow

Panel de publicación, edición y generación de reels.

Este repo ahora está listo para desplegarse en **un solo servicio de Cloud Run**:

- `server.js` sirve el frontend estático.
- `server.js` expone `/api/instagram/*` para OAuth y publicación.
- `server.js` expone `/api/blob/*` pero usando **Google Cloud Storage con URL firmada**.
- `server.js` monta el worker de variantes únicas desde `variant-worker/` en la misma app.

## Archivos clave

- `Dockerfile`: build del contenedor para Cloud Run.
- `server.js`: servidor principal para frontend, API y worker.
- `gcs-cors.json`: configuración CORS para que el navegador suba videos directo a GCS.
- `index.html`: entrada del panel.
- `src/assets/app.js`: lógica frontend.
- `variant-worker/`: worker integrado para `POST /jobs/variant-unique`.

## Variables de entorno

Estas son las variables que usa el despliegue en Google Cloud:

- `INSTAGRAM_APP_SECRET`: secreto de Meta/Instagram para el intercambio OAuth.
- `INSTAGRAM_APP_ID`: opcional. Si no lo seteás, se usa el ID hardcodeado existente.
- `GCS_BUCKET`: nombre del bucket de Google Cloud Storage donde se generan las URLs firmadas.
- `GCS_SIGNED_URL_TTL_MINUTES`: opcional. TTL de las URLs firmadas. Default `60`.
- `TMP_DIR`: opcional. Directorio temporal para el worker integrado. Default `/tmp/reelflow`.
- `MAX_PARALLEL_JOBS`: opcional. Límite interno del scheduler del worker. Default `0` para usar la cantidad de CPU disponible.
- `MAX_VARIANTS`: opcional. Máximo de variantes admitidas por job. Default `100`.
- `FFMPEG_BIN`: opcional. Binario alternativo de `ffmpeg`.
- `FFPROBE_BIN`: opcional. Binario alternativo de `ffprobe`.
- `META_GRAPH_API_VERSION`: opcional. Versión del Graph API de Meta usada para publicar en Instagram. Default `v21.0`.
- `VARIANT_WORKER_URL`: opcional solo si separás el worker en otro servicio. En este contenedor queda en el mismo origen.
- `PORT`: lo define Cloud Run. Default interno `8080`.

Compatibilidad opcional con los handlers proxy de Vercel:

- `CLOUD_RUN_BASE_URL`: URL pública de tu servicio de Cloud Run, por ejemplo `https://reelflow-xxxxx-uc.a.run.app`

## URLs de callback

Registrá estas URLs en Meta/Instagram:

- Callback OAuth: `https://TU-SERVICIO-CLOUD-RUN/auth/instagram/callback`
- Eliminación de datos: `https://TU-SERVICIO-CLOUD-RUN/eliminacion-datos.html`

## Despliegue en Google Cloud

### 1. Variables locales

```bash
PROJECT_ID="tu-proyecto"
REGION="us-central1"
SERVICE_NAME="reelflow"
BUCKET_NAME="tu-bucket-reelflow"
SA_NAME="reelflow-runner"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
```

### 2. Habilitar APIs

```bash
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com storage.googleapis.com iamcredentials.googleapis.com
```

### 3. Crear bucket y CORS

```bash
gcloud storage buckets create "gs://$BUCKET_NAME" --location="$REGION" --uniform-bucket-level-access
gcloud storage buckets update "gs://$BUCKET_NAME" --cors-file=gcs-cors.json
```

### 4. Crear service account y permisos

```bash
gcloud iam service-accounts create "$SA_NAME" --display-name="ReelFlow Cloud Run"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA_EMAIL" --role="roles/storage.objectUser"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA_EMAIL" --role="roles/iam.serviceAccountTokenCreator"
```

### 5. Desplegar

```bash
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --allow-unauthenticated \
  --cpu=2 \
  --memory=4Gi \
  --timeout=3600 \
  --concurrency=1 \
  --set-env-vars "GCS_BUCKET=$BUCKET_NAME,GCS_SIGNED_URL_TTL_MINUTES=60,MAX_PARALLEL_JOBS=1,MAX_VARIANTS=100,INSTAGRAM_APP_SECRET=TU_INSTAGRAM_APP_SECRET"
```

Si querés fijar tu `INSTAGRAM_APP_ID`, agregalo al `--set-env-vars`.

## Flujo de subida

El frontend ya no envía videos grandes en `multipart/form-data` a Cloud Run.

1. Pide a `POST /api/blob/upload` una URL firmada.
2. Sube el video directo a Google Cloud Storage con `PUT`.
3. Para publicar o generar variantes, Cloud Run recibe solo la URL firmada o una referencia equivalente.

En otras palabras: para videos de `500 MB` o `1 GB`, el archivo no atraviesa Cloud Run como payload multipart. Solo viaja al bucket y luego el servicio trabaja sobre la referencia.

## Nota sobre compatibilidad

- El frontend puede hablar directo con Cloud Run desde Vercel; los handlers de `api/` quedan como fallback si definís `CLOUD_RUN_BASE_URL`.
- El worker de FFmpeg ya no requiere un despliegue separado si corrés este contenedor único en Cloud Run.
- `vercel.json` ya reescribe `/health` y `/jobs/*` para pasar por esos proxies.

## Confirmación de archivos

Para este deploy no falta ningún archivo adicional:

- `Dockerfile`
- `server.js`
- `gcs-cors.json`
- `index.html`
- `src/`
- `vendor/`
- `auth/`
- `api/`
- `variant-worker/`
- `vercel.json`

Con eso, el proyecto queda listo para `gcloud run deploy`.
