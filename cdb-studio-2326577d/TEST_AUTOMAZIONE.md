# Verifiche build v0.31

Controlli eseguiti sulla build:

1. Sintassi di `app.js`, `auth.js` e `sw.js` con Node.
2. Versione `0.31.0` coerente tra HTML, JavaScript, service worker e `version.json`.
3. Tutti gli ID dell’interfaccia sono univoci.
4. Tutti gli elementi richiamati dal JavaScript esistono nell’HTML.
5. Parsing completo di `styles.css` senza errori tramite `tinycss2`.
6. Struttura HTML verificata: barra principale a tre passaggi, coda di revisione richiudibile e diagnostica negli strumenti tecnici.
7. Controllo statico delle regole responsive per 370 px, 699 px e modalità landscape.
8. Archivio finale verificato dopo la creazione con `unzip -t`.

## Da verificare sul dispositivo reale

- safe area e tastiera virtuale su iPhone;
- comportamento sticky del pulsante di generazione in Safari;
- condivisione iOS/macOS e AirDrop;
- service worker e cache dopo la pubblicazione HTTPS;
- flusso completo con un progetto reale e immagini pesanti.

L’ambiente Chromium del container applica un blocco aziendale alle URL locali, quindi il collaudo visivo completo viene lasciato al test su GitHub Pages. I controlli statici e di integrità sono stati completati.
