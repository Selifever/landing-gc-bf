# Landing GC BF – Black Friday city selector

Landing intermedia para el Linktree de Fever global (RRSS). El usuario elige su ciudad y se le redirige a la WL de Black Friday de esa ciudad (`https://feverup.com/m/{plan_id}`) con UTMs.

- Fuente de ciudades/plan IDs: sheet "Black Friday Organization_2026" › pestaña "Black Friday - WL Plans".
- Editar ciudades, regiones y UTMs: bloque `CONFIG` al inicio del `<script>` en `index.html`.
- UTMs: `utm_source=linktree&utm_medium=social&utm_campaign=black_friday_2026_wl&utm_content={ciudad}`.
