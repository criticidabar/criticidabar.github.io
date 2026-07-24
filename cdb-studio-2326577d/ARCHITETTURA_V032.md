# Architettura CdB Studio v0.32

## Ordine di caricamento

1. `js/config.js`
2. `js/runtime.js`
3. `js/state.js`
4. `js/engine.js`
5. `js/render.js`
6. `js/images.js`
7. `js/editorial.js`
8. `js/export.js`
9. `app.js`
10. `auth.js`

Gli script restano classici e compatibili con GitHub Pages. `runtime.js` contiene logging, timeout, annullamento, debounce/throttle e lock delle operazioni. Non modifica il formato progetto.

## Rendering

La slide corrente viene aggiornata separatamente dalla filmstrip. La filmstrip mantiene i nodi esistenti e ricostruisce soltanto la miniatura la cui firma è cambiata. Le raccolte immagini e template possono essere escluse dai render completi quando non sono mutate.

## Dipendenze e operazioni lunghe

- OCR: Tesseract viene caricato al primo uso o dalla diagnostica;
- PDF: `pdf-lib` viene caricato soltanto quando si avvia l’export PDF;
- ZIP: il writer ZIP interno non richiede librerie esterne;
- immagini remote: timeout di 15 secondi con `AbortController`;
- operazioni principali: lock per chiave, pulsanti disabilitati e timeout massimo.

## Compatibilità

Il formato resta `cdb-studio-portable-project`, schema 1. La normalizzazione delle slide, la migrazione legacy e il parser ZIP sono invariati rispetto alla v0.31.
