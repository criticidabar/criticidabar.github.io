# Test CdB Studio v0.33

Data: 20 luglio 2026.

## Ambiente

- controlli statici: Node.js locale;
- server locali: Python HTTP server su `127.0.0.1:4174` e `127.0.0.1:4173`;
- browser reale: Codex In-app Browser basato su Chromium;
- viewport responsive: 360×780 e 780×360.

## Test superati

- sintassi di tutti i JavaScript con `node --check`;
- `tests/static-check.mjs`: 305 ID univoci, 14 file richiesti, versione/cache 0.33.0 e fixture JSON valide;
- apertura pulita e creazione PIN locale;
- progetto iniziale da 3 slide;
- generazione da testo: 7 slide, nessun errore console;
- modifica titolo e corpo;
- aggiunta slide dal pannello di revisione;
- duplicazione, eliminazione e riordino slide;
- Undo: 8→7 slide; Redo: 7→8 slide;
- upload di `assets/logo.png`, crop attivo e zoom 150%;
- salvataggio portatile: 1 immagine, circa 95 KB;
- riapertura: nome e 8 slide persistenti;
- PNG, SVG, ZIP, PDF multipagina e pacchetto completo;
- doppio clic inviato a ZIP, PDF e pacchetto: un solo stato finale visibile, pulsanti riabilitati e nessun nuovo errore; il numero fisico di download non è stato ispezionabile dal driver;
- `pdf-lib` assente prima dell’export e presente dopo il PDF;
- migrazione fixture `client.st` v0.30: nome `Fixture legacy v0.30`, 3 slide e stato progetto JSON;
- JSON editoriale v0.31: 7 slide e nome `THE ODYSSEY vs L'AI`;
- rendering incrementale debounced: modificando la cover cambia soltanto la firma della miniatura 1;
- URL `application/json` rifiutato con messaggio specifico senza bloccare l’app;
- diagnostica: 11 pass, 0 warn, 0 fail, 2 info; IndexedDB, PNG, ZIP, service worker e cache operativi;
- cache/aggiornamento sulla precedente origine locale 4173: apertura finale v0.33 senza errori;
- 360×780: nessun overflow orizzontale, stage 345 px, barra workflow fixed;
- 780×360: nessun overflow orizzontale, stage 763 px, barra workflow static;
- logo PNG 490×349 con alpha bbox 0,0–490,349: nessun padding trasparente esterno rilevato.

## Riscontri non conclusivi

- il pulsante `＋` della filmstrip non ha reagito a un click automatizzato; il pulsante equivalente “Aggiungi slide” ha funzionato. Non è stato riprodotto manualmente fuori dal driver.
- il comando “Nuovo progetto” con dialogo `confirm()` non è stato completato dal driver; è stata verificata invece l’inizializzazione pulita di un nuovo progetto da 3 slide su una nuova origine.

## Non eseguiti

- Safari e iPhone fisico;
- AirDrop e Web Share reali;
- TMDb con chiave valida;
- OCR di screenshot reali con download modelli e riconoscimento IT/EN;
- progetto `.cdbproject.zip` storico reale;
- GitHub Pages HTTPS e offline su origine pubblicata: nessun remote Git configurato;
- portabilità reale Mac ↔ iPhone.
