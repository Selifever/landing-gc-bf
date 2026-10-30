# Landing GC BF – Black Friday city selector

Landing intermedia para el Linktree de Fever global (RRSS). El usuario elige su ciudad y se le redirige a la WL de Black Friday de esa ciudad (`https://feverup.com/m/{plan_id}`) con UTMs.

- Fuente de ciudades/plan IDs: sheet "Black Friday Organization_2026" › pestaña "Black Friday - WL Plans" (Mexico City sale de la pestaña "Black Friday - WL", plan `142366`).
- Editar ciudades, regiones, zonas horarias y UTMs: bloque `CONFIG` al inicio del `<script>` en `index.html`.
- UTMs por defecto: `utm_source=linktree&utm_medium=social&utm_campaign=black_friday_2026_wl&utm_content={ciudad}`.
- Cualquier `utm_*` que llegue en la URL de la landing (p. ej. `https://feverseasonals.com/?utm_source=instagram`) sobrescribe el valor por defecto; `utm_content` siempre es la ciudad.
- "Near you": sugiere una ciudad según la zona horaria del dispositivo (tercer valor de cada ciudad en `REGIONS`). Si no hay coincidencia, no se muestra.
- Look and feel: tokens de feverup.com (Montserrat, `#031419`, `#06232c`, `#0079ca`, botones pill).
- Publicación: GitHub Pages desde `main` → https://feverseasonals.com (todo lo que llega a `main` sale en vivo).
