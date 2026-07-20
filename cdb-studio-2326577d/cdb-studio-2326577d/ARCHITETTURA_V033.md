# Architettura CdB Studio v0.33

La v0.33 mantiene l’ordine e i confini tecnici della v0.32. Non introduce framework, backend o bundler.

## Stabilizzazione runtime

- `js/runtime.js`: logging, debounce/throttle, timeout, abort e registro delle operazioni attive;
- `app.js`: coordina i lock degli export e aggiorna la filmstrip debounced durante la scrittura rapida;
- `js/export.js`: isola gli errori per slide in ZIP, PDF e pacchetto completo;
- `js/images.js`: valida tipo MIME e decodifica delle immagini prima di inserirle.

## Compatibilità JSON

`importProjectFile()` distingue ora prima i payload progetto riconoscibili e soltanto dopo i JSON contenutistici. Il formato `client.st` passa quindi da `migrateLegacyProject()`; i normali array editoriali continuano a passare da `activateContentJson()`.

## Scostamento noto

La divisione dichiarata assegna Instagram e OCR a `editorial.js`, ma alcune funzioni di supporto relative all’import Instagram sono ancora in `images.js`. Non è stato spostato codice in questa release per evitare una modifica architetturale ampia durante la stabilizzazione.
