# Landing GC BF – Black Friday city selector

Landing intermedia para el Linktree de Fever global (RRSS). El usuario elige su ciudad y se le redirige a la WL de Black Friday de esa ciudad (`https://feverup.com/m/{plan_id}`) con UTMs.

Publicación: GitHub Pages desde `main` → https://feverseasonals.com (todo lo que llega a `main` sale en vivo).

## Cómo se edita

El HTML publicado (`index.html`) es **generado**: no lo edites a mano.

1. Ciudades, plan IDs, códigos de ciudad, idioma y zonas horarias: `src/cities.json`.
2. Diseño y textos: `src/index.html` (plantilla con `{{PLACEHOLDERS}}`).
3. UTMs, título, descripción y vídeos del hero: bloque `CONFIG` de `scripts/build.mjs`.
4. Regenerar (requiere Node 18+):

   ```bash
   node scripts/build.mjs
   ```

   Con `--check` además abre todas las WL y comprueba que responden 200 y en el idioma esperado:

   ```bash
   node scripts/build.mjs --check
   ```

## Actualización automática desde el sheet

La GitHub Action `.github/workflows/sync-cities.yml` lee el sheet cada 15 minutos (y cuando se lanza a mano desde *Actions › Sync cities › Run workflow*):

1. `scripts/sync.mjs` compara el sheet con `src/cities.json`:
   - **Ciudad nueva** en el sheet → se añade con código de ciudad, idioma, país, coordenadas y zona horaria leídos de `feverup.com/m/{id}`, y con la región según su país.
   - **Ciudad que desaparece** del sheet → se quita.
   - Las filas sin plan ID, o cuyo plan todavía no existe, se saltan y se reintentan en la siguiente ejecución.
   - Los plan IDs en `exclude` (Mexico City) nunca se añaden.
   - Lo editado a mano (nombre, nombre local, región) se conserva.
   - Si el sheet llega con menos de la mitad de ciudades, no se toca nada (protección ante un sheet roto).
2. `scripts/build.mjs --check` regenera la página y comprueba todas las WL. Si alguna falla, no se publica.
3. Si hay cambios, hace commit a la rama y, en `main`, pide un build de GitHub Pages.

**Configuración necesaria (una vez):** el sheet es privado, así que GitHub no puede leerlo tal cual.

1. En el sheet, crear una pestaña nueva (p. ej. `Landing feed`) con solo las dos columnas que hacen falta, para no publicar notas internas:
   `={'Black Friday - WL Plans'!B4:C}` (cabeceras `CITY` y `PLAN ID`).
2. *Archivo › Compartir › Publicar en la web* → solo esa pestaña → formato CSV → copiar la URL.
3. En GitHub: *Settings › Secrets and variables › Actions › New repository secret* → `SHEET_CSV_URL` = esa URL.

La programación cada 15 min solo corre desde `main` (es como funcionan las Actions programadas). GitHub las desactiva tras 60 días sin actividad en el repo.

**Opcional, al instante:** `scripts/apps-script.gs` lanza la Action en cuanto se edita el sheet (instrucciones dentro del archivo).

Para sincronizar a mano: `node scripts/sync.mjs --csv <archivo.csv|url>`. Para releer de las WL los datos de todas las ciudades: `node scripts/sync.mjs --refresh`.

## Near you

- Sin pedir permisos: se adivina la ciudad por zona horaria + idioma del navegador. Si el idioma trae país (`es-ES`) y ese país tiene la misma hora que el dispositivo, gana el idioma (Windows en España dice `Europe/Paris`).
- Con **"Use my location"** (o si el usuario ya había dado permiso), se usa la ubicación del dispositivo y se elige la ciudad más cercana (máx. 150 km). La ubicación no sale del navegador.

## Datos

- Ciudades/plan IDs: sheet "Black Friday Organization_2026" › pestaña "Black Friday - WL Plans". Mexico City no se incluye a propósito (`exclude` en `src/cities.json`).
- `code`: código interno de ciudad de Fever (`COM_DIM_CITY.CD_CITY` en el DWH), no siempre IATA (p. ej. Berlin = `QPP`, Jersey City = `DSS`). Para ciudades añadidas automáticamente sale de `cityCode` de la WL; coincide con el DWH en todas salvo Santa Rosa (WL: `STS`, DWH: `BVQ`; se mantiene `BVQ`).
- `lang`/`country`: idioma en el que Fever sirve `feverup.com/m/{id}` (comprobado con `--check`). Fever ya sirve cada WL en el idioma de su ciudad; `/{lang}/m/{id}` no existe (404).

## UTMs

Cada enlace sale prerenderizado con:

`?utm_source=linktree&utm_medium=social&utm_campaign={plan_id}_{city_code}&utm_content=bf26_city_selector`

- `utm_campaign` sigue la convención de Fever `{plan_id}_{city_code_lowercase}` (p. ej. `142275_mad`).
- `utm_content=bf26_city_selector` identifica que el tráfico viene de esta landing.
- Si la URL de la landing trae `utm_source`, `utm_medium` o `utm_term` (p. ej. `https://feverseasonals.com/?utm_source=instagram`), se sobrescriben en todos los enlaces. `utm_campaign` y `utm_content` nunca se sobrescriben.

## SEO, bots y preview

- Contenido prerenderizado: todos los enlaces, títulos y textos están en el HTML (sin depender de JS).
- `robots.txt` permite todo, incluidos `AdsBot-Google` y `AdsBot-Google-Mobile` (que ignoran `User-agent: *`), y apunta a `sitemap.xml`.
- `canonical`, `meta robots`, Open Graph/Twitter (`og-image.jpg`, 1200×630) y JSON-LD (`WebPage` + `ItemList` de las WL).
- `.nojekyll`: GitHub Pages sirve los archivos tal cual, sin Jekyll.

## Hero

Vídeos oficiales "Immersive Listing Landing" de Fever BF26 (Cloudinary › `0_Others/Fever_Fever/Seasonals/Black Friday/2026/Black Friday/Marketplace`), servidos optimizados desde `media.feverup.com` (~0,7 MB). El fotograma se muestra como imagen estática (también para bots y sin JS); el vídeo se carga encima por JS y no se reproduce con "reducir movimiento" ni con ahorro de datos.

Paleta BF26 sacada de las creatividades oficiales: fondo `#0d0120`, lila `#d2aeff`, verde `#51da94`, azul `#67cbff`, amarillo `#ffd779`, rojo `#ed565b`.
