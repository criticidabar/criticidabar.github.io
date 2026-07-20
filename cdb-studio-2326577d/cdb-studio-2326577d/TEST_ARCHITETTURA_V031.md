# Test architettura v0.31

## Controlli automatici eseguiti

- sintassi Node dei file JavaScript separati;
- concatenazione nell’ordine reale di caricamento, senza dichiarazioni duplicate;
- caricamento con DOM simulato: 236 registrazioni di eventi senza errori;
- creazione del progetto predefinito;
- rendering SVG delle 48 varianti;
- generazione di una scaletta editoriale;
- importazione di un JSON contenutistico;
- creazione di un archivio ZIP;
- 305 ID HTML univoci;
- 277 riferimenti letterali dall’interfaccia al DOM, nessuno mancante;
- presenza di tutti i file inclusi nella cache offline.

## Limiti del test

Il collaudo reale di Safari/iPhone, IndexedDB, service worker, TMDb, OCR e condivisione di sistema richiede la pubblicazione su origine HTTPS.
