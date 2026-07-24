# CdB Studio v0.32

## Prestazioni

- miniature aggiornate incrementalmente, senza rigenerare tutte le slide a ogni selezione;
- rendering dei campi rapidi limitato con throttle;
- raccolte immagini e template escluse dai render completi quando non cambiano;
- `pdf-lib` caricata solo quando viene richiesto il PDF; OCR resta caricato su richiesta;
- rilascio del main thread tra le slide durante la creazione PDF.

## Stabilità ed errori

- nuovo `js/runtime.js` per log diagnostici, timeout, debounce/throttle e operazioni esclusive;
- cattura centralizzata di errori JavaScript e promise rejection;
- timeout e annullamento tramite `AbortController` per download immagini e operazioni lunghe;
- protezione da avvii duplicati per salvataggio/condivisione progetto e PDF;
- errori PDF isolati per slide: le slide valide continuano a essere esportate;
- messaggi di errore con azione correttiva e log diagnostico esteso a 100 eventi.

## Compatibilità

- formato portatile invariato: `cdb-studio-portable-project`, schema 1;
- migrazione dei vecchi `.cdb.json` invariata;
- lettura dei `.cdbproject.zip` v0.31 invariata;
- PWA statica, offline e senza backend o framework.

## Bug corretti

- eliminato il caricamento iniziale obbligatorio di `pdf-lib`;
- eliminata la doppia implementazione del loader di script esterni;
- gli errori di metadati immagine/font/service worker non generano più promise rejection silenziose.
