# Migration Plan: Variantes Únicas a Cloud Run

## Alcance

Migrar la ejecución de FFmpeg WASM del flujo **Variantes Únicas** hacia un worker en Google Cloud Run con FFmpeg nativo, sin reescribir el algoritmo de generación de variantes.

## Archivos afectados

- `src/assets/app.js`
- `src/engine/variantTransformer.js`
- `src/engine/ffmpegRunner.js`
- `variant-worker/package.json`
- `variant-worker/Dockerfile`
- `variant-worker/server.js`
- `variant-worker/routes/*`
- `variant-worker/controllers/*`
- `variant-worker/services/*`
- `variant-worker/ffmpeg/*`
- `variant-worker/temp/*`

## Funciones afectadas

- `startVariantUniqueGeneration`
- `ensureVariantUniqueRuntime`
- `loadFFmpeg`
- `execEditorFFmpegChecked`
- `probeHasAudio`
- `probeDuration`
- `renderFormatQueue`
- `writePlanImages`
- `ensureFont`
- `buildFFmpegCommand`
- `VariantTransformer.generateRandomTransforms`
- `VariantTransformer.resolveFrameSize`
- `VariantTransformer.buildFFmpegCommand`

## Motivo del cambio

- Eliminar la ejecución pesada de FFmpeg WASM en el navegador para el flujo de Variantes Únicas.
- Centralizar el procesamiento en Cloud Run con FFmpeg nativo.
- Mantener intacto el algoritmo de variantes, hashes, firmas de audio y validaciones.
- Reducir carga del cliente y evitar dependencia del worker WASM en este flujo.

## Impacto del cambio

- El frontend dejará de escribir/leer archivos en el FS virtual de FFmpeg WASM para Variantes Únicas.
- `startVariantUniqueGeneration` pasará a crear un job remoto, consultar estado y descargar el ZIP final.
- El backend nuevo será responsable de:
  - recibir el video y la configuración,
  - ejecutar FFmpeg nativo,
  - generar variantes,
  - construir ZIP y manifest,
  - exponer progreso y resultado.
- El resto del editor, autenticación, OAuth Instagram, publicación, gestión de cuentas, Vercel Blob y login no se tocarán salvo el punto mínimo necesario para invocar el worker.

## Riesgos

- Diferencias de comportamiento entre FFmpeg WASM y FFmpeg nativo en filtros, codecs o tiempos.
- Cambios en la forma de reportar progreso al frontend.
- Necesidad de ajustar timeouts y concurrencia en Cloud Run para cargas altas.

