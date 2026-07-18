# CdB Studio v0.3

Web app statica mobile-first per creare caroselli **Critici da Bar**, pubblicabile gratuitamente su GitHub Pages e utilizzabile anche da desktop.

## Novità della v0.3

- 4 famiglie e 17 varianti recuperate dall'app Python:
  - Originale: 3;
  - Classico CdB: 4;
  - Disclosure: 3;
  - Ritorni in Sala: 7.
- selettore visuale di famiglia e variante;
- template personali salvati sul dispositivo;
- ricerca immagini interna tramite Wikimedia Commons;
- collegamento rapido a Google Immagini;
- importazione da URL diretto;
- archivio locale delle immagini in IndexedDB;
- uso da Mac con layout desktop a due colonne;
- trascinamento con mouse o dito;
- pinch e maniglia per ridimensionare;
- doppio tap per modificare i testi;
- font Anybody, Archivo e Saira;
- autosave, annulla/ripeti, esportazione PNG, SVG, ZIP e progetto JSON;
- importazione iniziale dei testi dai progetti della vecchia app;
- service worker aggiornato con strategia rete-prima per evitare che GitHub Pages mostri versioni obsolete.

## Protezione

L'app usa un percorso non collegato al sito, istruzioni `noindex` e un PIN locale. È una barriera intenzionalmente leggera: non equivale a un'autenticazione server. Bozze, immagini e template personali rimangono nel browser del dispositivo e non vengono caricati nel repository.

## Limiti attuali

- i 17 layout sono stati ricostruiti nel nuovo motore, ma richiedono ancora confronto visivo e rifinitura rispetto agli originali;
- la ricerca interna è più limitata della vecchia ricerca DDGS perché una web app statica non può interrogare liberamente tutti i motori di ricerca;
- import Instagram, OCR, PDF e testi liberi non sono ancora migrati;
- l'SVG mantiene i testi modificabili ma non incorpora i font;
- la sincronizzazione automatica tra iPhone e Mac non è presente: per trasferire un progetto si usa il file `.cdb.json`.

## Test consigliato

Provare sia su Safari iPhone sia su Chrome/Safari Mac:

1. creare un carosello con almeno tre varianti;
2. caricare e ritagliare un'immagine;
3. provare ricerca e archivio;
4. spostare e ridimensionare titolo, immagine e logo;
5. esportare PNG e ZIP;
6. chiudere e riaprire la pagina per verificare l'autosalvataggio.


## v0.6
- Mantiene le 17 varianti e i template personali della v0.3.
- Aggiunge testi liberi completi, rotazione e larghezza area testo.
- Aggiunge importazione articolo tramite Reader API, tentativo Instagram e OCR screenshot.
- Aggiunge PDF multipagina e SVG fedele indipendente dai font.
- L’import Instagram diretto non è garantito: la piattaforma può bloccare l’estrazione da una web app statica.


### Novità v0.6

- aggiunto **Anton** al selettore dei font;
- Anton è il carattere predefinito per nuovi progetti, nuovi testi liberi e importazioni;
- i vecchi riferimenti a Nickel Gothic vengono convertiti automaticamente in Anton;
- il controllo del peso viene bloccato a 400 quando è selezionato Anton, perché è un font a peso singolo.
- ripristinata la famiglia **NUOVO CdB** con quattro template: Copertina diagonale, Corpo editoriale, Domanda fumetto e Finale diagonale;
- mantenute tutte le 17 varianti precedenti, per un totale di 21 template;
- selezione completamente riprogettata: trascinamento dentro il riquadro, quattro maniglie angolari, pinch e maniglia blu per la larghezza della casella di testo;
- il ridimensionamento diretto dei testi aggiorna insieme dimensione e area di impaginazione, evitando il vecchio effetto quasi solo verticale;
- frecce della tastiera per spostamenti precisi su Mac, `Shift` + freccia per 10 px.
