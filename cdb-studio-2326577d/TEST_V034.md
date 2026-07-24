# Test v0.34

## Controlli automatici eseguiti

- sintassi JavaScript: `node --check` su `app.js`, `auth.js`, `sw.js`, `js/*.js` e test statico — **superato**;
- coerenza statica: `node tests/static-check.mjs` — **superato**, 305 ID univoci, versione 0.34.0 e font locale verificato;
- integrità patch: `git diff --check` — **superato**.

## Controlli browser eseguiti su server locale

- apertura app v0.34 — **superata**;
- creazione del progetto predefinito da tre slide — **superata**;
- nuovo titolo Canvas con `font-family: 'Nickel Gothic v3'` — **verificato**;
- caricamento Font Loading API di Nickel Gothic — **superato**;
- export **SVG per Affinity** — **superato**, messaggio `SVG Affinity pronto`;
- console browser — **0 errori, 0 avvisi**;
- aggiornamento service worker da richiesta v0.33 a v0.34 e cache del font locale — **verificato**.
- logo caricato nell’editor come data URL SVG — **verificato**;
- resa visiva del logo vettoriale nell’anteprima browser — **verificata**;

## Esame strutturale dello SVG esportato

File verificato: `nuovo-carosello-1-affinity.svg`, 177591 byte.

- `Titolo-4`: figlio diretto di `<svg>`, tre `<tspan>`, Nickel Gothic v3;
- `Testo-5`: figlio diretto di `<svg>`, un `<tspan>`, Nickel Gothic v3;
- font OTF incorporato come data URL — **verificato**;
- gruppi intermedi per titolo e corpo — **assenti**.

Il primo import in Affinity ha mostrato Helvetica: Affinity ha ignorato `font-family` dichiarato nello `style` e il webfont incorporato. L’export è stato quindi corretto usando gli attributi SVG espliciti `font-family`, `font-size` e `font-weight`; la nuova verifica Affinity resta da confermare sul file rigenerato.

## Logo vettoriale

File verificato: `nuovo-carosello-1-affinity (2).svg`.

- livello `Logo-6` presente come gruppo vettoriale;
- due tracciati per fumetto e riempimento;
- due testi Nickel Gothic per la scritta;
- zero elementi `<image>` all’interno del logo;
- PNG originale mantenuto come fallback dell’app.

La copertina classica è stata corretta riducendo il logo a 280×200 px, centrato a 540×134, e spostando il riferimento del titolo da y=330 a y=350 per evitare sovrapposizioni.

Verifica browser reale: il rettangolo visivo del logo termina circa 17 px prima dell'inizio del titolo nel viewport desktop usato per il controllo; nessuna sovrapposizione e nessun errore o warning in console.

Il controllo qualità analizza inoltre l'intersezione del logo con titolo, testo e testi liberi su ogni slide. Una sovrapposizione minima genera un avviso; una copertura superiore al 5% dell'area del testo, o abbastanza profonda da ostacolare una riga, genera un errore con l'azione correttiva proposta.

Verifica browser sull'intero progetto predefinito: il primo controllo ha rilevato una sovrapposizione residua dell'1% nella slide corpo classica. Dopo la correzione del relativo layout, un secondo controllo ha restituito zero problemi logo/testo e zero errori o warning JavaScript in console.

## Controllo Affinity

- aprire lo SVG v0.34;
- verificare che titolo e corpo siano selezionabili direttamente;
- modificare l’intero contenuto di ciascun blocco in una sola operazione;
- verificare il riconoscimento di Nickel Gothic v3;
- confrontare la resa con il PNG.

Il campione v0.34 è stato aperto realmente in Affinity. La conferma visiva conclusiva della selezione e modifica diretta dei due blocchi è lasciata aperta: richiede osservazione del pannello Livelli o feedback dell’utente.
