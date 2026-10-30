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

## Datos

- Ciudades/plan IDs: sheet "Black Friday Organization_2026" › pestaña "Black Friday - WL Plans". Mexico City no se incluye a propósito.
- `code`: código interno de ciudad de Fever (`COM_DIM_CITY.CD_CITY` en el DWH), no siempre IATA (p. ej. Berlin = `QPP`, Jersey City = `DSS`).
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
