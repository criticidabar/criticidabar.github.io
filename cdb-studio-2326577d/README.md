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
