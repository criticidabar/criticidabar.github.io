# CdB Studio v0.33

Generatore automatico di caroselli Critici da Bar con rifinitura assistita.

## Novità v0.33 — stabilizzazione e compatibilità

La v0.33 consolida la v0.32: estende i lock anti-doppio avvio, isola gli errori delle singole slide negli export multipli, corregge il riconoscimento dei progetti JSON legacy e aggiunge fixture e controlli ripetibili. PDF e OCR restano caricati su richiesta.

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
https://criticidabar.github.io/cdb-studio-2326577d/?v=33
```
