# CdB Studio v0.33

Release di stabilizzazione della v0.32, senza nuove grandi funzionalità.

## Correzioni

- lock anti-doppio avvio esteso a PNG, SVG, ZIP e pacchetto completo;
- timeout centralizzato ora reagisce anche a un annullamento esplicito;
- ZIP e pacchetto completo isolano gli errori della singola slide e includono `errori-export.txt` quando necessario;
- il main thread viene rilasciato fra le slide durante gli export multipli;
- le miniature dei testi rapidi si aggiornano con debounce senza attendere un evento `change`/blur;
- i file URL non immagine vengono riconosciuti con un messaggio specifico invece di un generico errore CORS;
- la diagnostica distingue correttamente `localhost` da HTTPS;
- dichiarata la favicon usando l’icona PWA esistente, eliminando il 404 automatico del browser;
- corretto il riconoscimento dei vecchi progetti `client.st`, che potevano essere interpretati come JSON editoriale;
- aggiunta matrice di fixture con provenienza dichiarata.

## Test e compatibilità

- aggiunto `tests/static-check.mjs`;
- aggiunta fixture contenutistica v0.31 realmente presente nella baseline;
- aggiunta fixture legacy v0.30 sintetica per il ramo di migrazione `client.st`;
- l’assenza di un `.cdbproject.zip` storico reale resta esplicitamente documentata.
