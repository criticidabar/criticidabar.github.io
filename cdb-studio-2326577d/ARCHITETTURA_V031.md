# Architettura CdB Studio v0.31

## Obiettivo

Ridurre il file monolitico e isolare le aree a maggior rischio di regressione, mantenendo una web app statica compatibile con GitHub Pages e con i progetti esistenti.

## Ordine di caricamento

1. `js/config.js`
2. `js/state.js`
3. `js/engine.js`
4. `js/render.js`
5. `js/images.js`
6. `js/editorial.js`
7. `js/export.js`
8. `app.js`
9. `auth.js`

I file usano script classici, non bundler e non import dinamici. In questo modo l’app continua a funzionare direttamente su GitHub Pages e offline tramite service worker.

## Regola per le prossime modifiche

- cambi ai preset o ai template: `config.js`;
- cambi al modello dati, livelli, undo o IndexedDB: `engine.js`;
- cambi grafici e di rendering: `render.js`;
- cambi a TMDb, fonti e ricerca immagini: `images.js`;
- cambi alla scrittura automatica e agli import: `editorial.js`;
- cambi a PNG, SVG, PDF, ZIP, backup e diagnostica: `export.js`;
- cambi all’interazione dell’utente: `app.js`.

## Compatibilità

Il formato progetto resta `cdb-studio-portable-project`, schema 1. La migrazione dei progetti precedenti continua a essere gestita dal motore.
