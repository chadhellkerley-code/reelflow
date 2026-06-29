# variant-worker

Worker HTTP para generar variantes únicas de video y devolver un ZIP con los resultados.

## Requisitos

- Node.js 20+
- `ffmpeg` y `ffprobe` disponibles en `PATH`
- Opcionalmente, puedes fijar binarios alternativos con `FFMPEG_BIN` y `FFPROBE_BIN`

## Instalación

```bash
cd variant-worker
npm install
```

## Ejecución

```bash
npm run dev
```

También puedes usar:

```bash
npm start
```

### Entrypoint

- Archivo de entrada: `server.js`

### Puerto

- Puerto por defecto: `8080`
- Variable: `PORT`

## Variables de entorno

- `PORT`: puerto HTTP del worker. Default `8080`.
- `TMP_DIR`: directorio temporal para jobs. Default `variant-worker/temp`.
- `MAX_PARALLEL_JOBS`: cantidad máxima de jobs concurrentes. Default `0` para dejar que el scheduler use su criterio interno.
- `MAX_VARIANTS`: máximo permitido para `cantidadVariantes`. Default `300`.
- `FFMPEG_BIN`: binario a usar para `ffmpeg`. Default `ffmpeg`.
- `FFMPEG_PATH`: alias opcional para `FFMPEG_BIN`.
- `FFPROBE_BIN`: binario a usar para `ffprobe`. Default `ffprobe`.
- `FFPROBE_PATH`: alias opcional para `FFPROBE_BIN`.

## Endpoint

### `POST /jobs/variant-unique`

Contrato:

- `multipart/form-data`
- Campo requerido: `video`
- Campo requerido: `cantidadVariantes`
- Campo opcional: `config` con JSON serializado

Respuesta inmediata:

- `200 OK`
- Devuelve directamente el ZIP generado para la variante única

Headers de respuesta útiles:

- `X-Job-Id`
- `X-Job-Status`
- `X-Job-Progress`

### Compatibilidad

- `GET /jobs/:id`
- `GET /jobs/:id/download`

Estos endpoints siguen disponibles para compatibilidad interna, pero el flujo principal ya no depende de polling.

## Ejemplo de prueba

```bash
curl -X POST http://localhost:8080/jobs/variant-unique \
  -F "video=@./sample.mp4" \
  -F "cantidadVariantes=3" \
  -F 'config={"maxAttemptsPerVariant":2,"frameSizes":[720,540,360]}'
```

Ejemplo de descarga:

```bash
curl -L -X POST http://localhost:8080/jobs/variant-unique \
  -F "video=@./sample.mp4" \
  -F "cantidadVariantes=3" \
  -F 'config={"maxAttemptsPerVariant":2,"frameSizes":[720,540,360]}' \
  -o variantes-unicas.zip
```

## Prueba local completa

1. Ejecuta `npm install`.
2. Arranca el worker con `npm run dev`.
3. Sube un video con el `curl` anterior.
4. Espera la respuesta del `POST`.
5. Guarda el ZIP que devuelve esa misma respuesta.
