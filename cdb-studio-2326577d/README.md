# CdB Studio v0.34

Generatore automatico di caroselli Critici da Bar con rifinitura assistita.

## Novità v0.34 — export Affinity e identità tipografica

La v0.34 introduce Nickel Gothic v3 come font predefinito dei nuovi testi e lo include negli asset offline. Lo SVG modificabile usa un export dedicato ad Affinity: titolo, corpo e testi liberi sono singoli oggetti testuali, senza i due gruppi intermedi prodotti dalla v0.33. Il logo CdB è stato ricostruito come SVG e viene incorporato come geometria vettoriale nell’export Affinity. PNG, SVG fedele, progetti e formati legacy restano invariati.

## Architettura consolidata dalla v0.31

Il precedente `app.js` monolitico è stato separato in aree tecniche indipendenti:

- `js/config.js`: preset, famiglie grafiche e costanti;
- `js/state.js`: stato condiviso dell’app;
- `js/engine.js`: modello del progetto, livelli, cronologia e persistenza;
- `js/render.js`: layout, SVG e rendering Canvas;
- `js/images.js`: libreria immagini, TMDb e ricerca;
- `js/editorial.js`: generazione automatica, URL, JSON, Instagram e OCR;
- `js/export.js`: controllo qualità, export, progetto portatile e diagnostica;
- `app.js`: interfaccia, eventi e avvio.

Questa modifica non cambia il formato dei progetti e non rimuove funzioni. Riduce però il rischio che una modifica a generazione, export o immagini introduca regressioni nelle altre aree.

## Pubblicazione

Sostituire la cartella `cdb-studio-2326577d` nel repository GitHub Pages.

Aprire poi:

```text
https://criticidabar.github.io/cdb-studio-2326577d/?v=34
```
