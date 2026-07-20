'use strict';

const APP_VERSION = '0.33.0';
const PORTABLE_PROJECT_FORMAT = 'cdb-studio-portable-project';
const PORTABLE_PROJECT_SCHEMA = 1;
const W = 1080;
const H = 1350;
const SVG_NS = 'http://www.w3.org/2000/svg';
const COLORS = { orange:'#ff6f00', cream:'#fff6ea', blue:'#005c78', ink:'#111111', yellow:'#f4c430', white:'#ffffff' };
const BRAND_SWATCHES = [COLORS.orange,COLORS.cream,COLORS.blue,COLORS.white,COLORS.ink,COLORS.yellow,'#1f27b8'];
const AUTOMATION_PRESETS = {
  auto:{label:'Automatico',description:'Riconosce il formato dal contenuto.',families:['n','fd','fc','fk','fr','fs'],tone:null,density:null,slides:'auto'},
  news:{label:'Notizia cinema',description:'Hook forte, dato, dettaglio, conseguenza e chiusura.',families:['n','fm','fs','fd'],tone:'informative',density:'short',slides:'7',roles:['context','fact','detail','quote','impact','critique','conclusion']},
  review:{label:'Recensione',description:'Contesto, punti di forza, limite, giudizio e community.',families:['fk','fg','fd'],tone:'critical',density:'medium',slides:'7',roles:['context','detail','critique','impact','conclusion','fact','quote']},
  debate:{label:'Opinione / dibattito',description:'Tesi, fatti, controcampo, nostro parere e domanda finale.',families:['fc','fd','n'],tone:'critical',density:'medium',slides:'7',roles:['context','detail','quote','impact','critique','fact','conclusion']},
  returns:{label:'Ritorni / uscite',description:'Rubrica con calendario, schede, motivi e CTA.',families:['fr','r'],tone:'informative',density:'short',slides:'7',roles:['context','fact','detail','detail','impact','critique','conclusion']},
  list:{label:'Lista / classifica',description:'Sequenza numerata di titoli o punti con ritmo visivo.',families:['r','n','c'],tone:'informative',density:'short',slides:'7',roles:['fact','detail','fact','detail','fact','critique','conclusion']},
  quote:{label:'Citazione / dichiarazione',description:'La frase al centro, poi contesto, implicazioni e parere.',families:['fd','fs','fg'],tone:'critical',density:'medium',slides:'7',roles:['context','quote','detail','impact','critique','conclusion','conclusion']}
};
const CURATED_FAMILY_VARIANTS = {
  n:['corpo'],o:['corpo'],c:['corpo','domanda'],d:['editoriale'],
  r:['scheda_dx','scheda_sx','fumettone','card_nere'],
  fd:['immagine_alta','citazione'],fr:['scheda','fumetto'],fs:['editoriale'],
  fg:['storia','personaggio'],fk:['racconto','giudizio'],fc:['argomento','confronto'],fm:['editoriale','panorama']
};
const IMAGE_STOP_WORDS = new Set('a ad al allo ai agli alla alle anche ancora avere che chi ci con contro cosa cui da dal dalla dalle dei del della delle di e ed era essere fa fra gli ha hanno i il in io la le lo ma mi ne nei nel nella nelle non o per più poi quale quando quanto questa queste questi questo se senza si sia sono su sul sulla tra un una uno voi come dopo prima molto tutto tutti tutte ogni può possono perché mentre invece dove'.split(/\s+/));
const EDITORIAL_GENERIC_HEADLINES = new Set([
  'IL DETTAGLIO CHE CONTA','IL VERO PUNTO È UN ALTRO','IL VERO PUNTO E UN ALTRO','E QUESTO CAMBIA LE COSE',
  'COSA SIGNIFICA DAVVERO?','PUNTO CHIAVE','IL DATO CHE CAMBIA TUTTO','ECCO DA DOVE PARTIAMO',
  'PAROLE CHE PESANO','IL NOSTRO PARERE','IL PUNTO DI PARTENZA'
]);
const EDITORIAL_ROLE_HINTS = {
  context:/\b(?:inizia|parte|contesto|annunci|progetto|film|serie|storia|prima|origine|debutto)\w*/i,
  fact:/\b(?:\d+[,.]?\d*|milion|miliard|percent|%|record|incass|debutto|voto|data|uscita|budget)\w*/i,
  detail:/\b(?:come|perché|grazie|attraverso|costruit|realizz|girato|tecnica|effett|scena|set|dettaglio)\w*/i,
  quote:/[“"][^”"]+[”"]|\b(?:ha dichiarato|ha detto|ha spiegato|ha raccontato|secondo)\b/i,
  impact:/\b(?:quindi|perciò|significa|conseguenz|futuro|potrebbe|rischia|cambia|scenario|porta a|da qui)\w*/i,
  critique:/\b(?:ma|però|tuttavia|in realtà|secondo noi|nostro parere|problema|non convince|presa in giro|forse)\b/i,
  conclusion:/\b(?:alla fine|in sintesi|dunque|resta|domanda|futuro|conclusione)\w*/i
};
const EDITORIAL_ROLE_BODY_LIMITS = {
  short:{context:170,fact:175,detail:185,quote:190,impact:190,critique:205,conclusion:190},
  medium:{context:245,fact:235,detail:255,quote:250,impact:265,critique:285,conclusion:250},
  long:{context:360,fact:345,detail:380,quote:365,impact:390,critique:420,conclusion:370}
};
const DB_NAME = 'cdb-studio';
const DB_VERSION = 8;
const CURRENT_KEY = 'current';
const DIAGNOSTIC_OCR_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js';

const FAMILIES = {
  n: { label:'NUOVO CdB', variants:{
    copertina:{label:'Copertina diagonale',description:'Il nuovo stile blu e arancione con foto piena, etichetta e diagonali.',design:'new-cover'},
    corpo:{label:'Corpo editoriale',description:'Foto superiore, tag Critici da Bar e testo pulito su crema.',design:'new-body'},
    domanda:{label:'Domanda fumetto',description:'Grande fumetto arancione su fondo blu, pensato per le CTA.',design:'new-question'},
    finale:{label:'Finale diagonale',description:'Chiusura grafica blu e arancione con CTA e logo.',design:'new-final'}
  }},
  o: { label:'ORIGINALE', variants:{
    copertina:{label:'Copertina',description:'Foto piena, logo alto e titolo forte in basso.',design:'original-cover'},
    corpo:{label:'Corpo',description:'Foto piena con testo e accento arancione.',design:'original-body'},
    finale:{label:'Finale',description:'Chiusura scura con titolo arancione.',design:'original-final'}
  }},
  c: { label:'CLASSICO CdB', variants:{
    copertina:{label:'Copertina',description:'Crema, titolo centrale e foto ampia in basso.',design:'classic-cover'},
    corpo:{label:'Corpo',description:'Titolo pulito e immagine incorniciata.',design:'classic-body'},
    domanda:{label:'Domanda',description:'Domanda centrale con fumetto e foto ritagliata.',design:'classic-question'},
    finale:{label:'Finale',description:'Sfondo blu, CTA arancione e logo centrale.',design:'classic-final'}
  }},
  d: { label:'DISCLOSURE', variants:{
    hero:{label:'Hero',description:'Titolo editoriale sopra una foto a pieno formato.',design:'disclosure-hero'},
    editoriale:{label:'Editoriale',description:'Fascia scura, testo lungo e foto protagonista.',design:'disclosure-editorial'},
    domanda:{label:'Domanda / CTA',description:'Domanda chiara con foto e invito all’azione.',design:'disclosure-question'}
  }},
  r: { label:'RITORNI IN SALA', variants:{
    copertina:{label:'Copertina',description:'Foto piena e titolo cinematografico su fascia scura.',design:'returns-cover'},
    domanda_fumetto:{label:'Domanda + fumetto',description:'Foto superiore e grande fumetto arancione.',design:'returns-question'},
    scheda_dx:{label:'Scheda foto DX',description:'Testo a sinistra e fotografia a destra.',design:'returns-sheet-right'},
    scheda_sx:{label:'Scheda foto SX',description:'Fotografia a sinistra e testo a destra.',design:'returns-sheet-left'},
    fumettone:{label:'Fumettone',description:'Foto piena con grande pannello crema centrale.',design:'returns-big-bubble'},
    card_nere:{label:'Card nere',description:'Tre schede nere sovrapposte su fondo crema.',design:'returns-cards'},
    finale:{label:'Finale',description:'Domanda e CTA su fondo crema.',design:'returns-final'}
  }},
  fd: { label:'FEDELE · CREMA & RITAGLI', variants:{
    copertina:{label:'Cover poster',description:'Poster pieno, titolo arancione e richiamo blu come nei caroselli Dune.',design:'faith-dune-cover'},
    citazione:{label:'Citazione + ritagli',description:'Sfondo crema, testo centrale e spazio per personaggi scontornati.',design:'faith-dune-quote'},
    immagine_alta:{label:'Foto alta + commento',description:'Fotogramma superiore, testo centrale e ritagli nella parte bassa.',design:'faith-dune-image-top'},
    finale:{label:'Domanda + CTA',description:'Chiusura crema con fumetto, invito ai commenti e personaggio in basso.',design:'faith-dune-final'}
  }},
  fr: { label:'FEDELE · RITORNI IN SALA', variants:{
    copertina:{label:'Cover calendario',description:'Immagine piena, logo alto e titolo da rubrica cinematografica.',design:'faith-returns-cover'},
    fumetto:{label:'Perché al cinema?',description:'Foto superiore e grande fumetto arancione nella metà bassa.',design:'faith-returns-bubble'},
    scheda:{label:'Scheda editoriale',description:'Testo a sinistra e collage o fotogramma a destra.',design:'faith-returns-split'},
    finale:{label:'Finale commenti',description:'Domanda centrale, freccia e CTA pulita su crema.',design:'faith-returns-final'}
  }},
  fs: { label:'FEDELE · DISCLOSURE', variants:{
    copertina:{label:'Cover atmosferica',description:'Foto a piena pagina, titolo arancione e logo in basso.',design:'faith-disclosure-cover'},
    editoriale:{label:'Editoriale atmosferico',description:'Fotogramma pieno con titolo arancione e testo bianco ad alta leggibilità.',design:'faith-disclosure-editorial'},
    finale:{label:'Finale uscita / CTA',description:'Sfondo crema, fumetto domanda, blocchi blu-arancio e ritaglio in basso.',design:'faith-disclosure-final'}
  }},
  fg: { label:'FEDELE · PORCO ROSSO / GHIBLI', variants:{
    copertina:{label:'Cover illustrata',description:'Fotogramma pieno, platea in basso e titolo turchese-arancione.',design:'faith-ghibli-cover'},
    storia:{label:'Storia + immagine alta',description:'Grande fotogramma superiore e commento editoriale nella fascia crema.',design:'faith-ghibli-story'},
    personaggio:{label:'Personaggio / citazione',description:'Fotogramma dominante e frase centrale con accento grafico.',design:'faith-ghibli-character'},
    finale:{label:'Finale uscita',description:'Domanda, data di uscita e spazio per un ritaglio illustrato.',design:'faith-ghibli-final'}
  }},
  fk: { label:'FEDELE · CAVALIERE DEI SETTE REGNI', variants:{
    copertina:{label:'Apertura recensione',description:'Sfondo crema, punteggio, platea e ritagli narrativi.',design:'faith-knight-cover'},
    racconto:{label:'Racconto di Westeros',description:'Titolo centrale, personaggi ai bordi e cinema in basso.',design:'faith-knight-story'},
    giudizio:{label:'Giudizio / voto',description:'Slide argomentativa con score, claim forte e ritagli.',design:'faith-knight-verdict'},
    finale:{label:'Finale community',description:'Domanda blu, voto e invito ai commenti.',design:'faith-knight-final'}
  }},
  fc: { label:'FEDELE · DIBATTITO CINEMA', variants:{
    copertina:{label:'Domanda di apertura',description:'Domanda blu, risposta arancione e platea cinematografica.',design:'faith-cinema-cover'},
    argomento:{label:'Argomento + ritaglio',description:'Claim centrale con spazio per un personaggio scontornato.',design:'faith-cinema-argument'},
    confronto:{label:'Confronto / tesi',description:'Alternanza blu-arancione e composizione più dinamica.',design:'faith-cinema-contrast'},
    finale:{label:'Finale condividi',description:'Doppia CTA per commentare e condividere.',design:'faith-cinema-final'}
  }},
  fm: { label:'FEDELE · MAD MAX', variants:{
    copertina:{label:'Cover notizia',description:'Foto piena, velatura scura e titolo da breaking news cinematografica.',design:'faith-madmax-cover'},
    editoriale:{label:'Editoriale personaggio',description:'Ritratto pieno, titolo bianco e richiamo arancione.',design:'faith-madmax-editorial'},
    panorama:{label:'Scenario / futuro',description:'Fotogramma panoramico con testo basso ad alta leggibilità.',design:'faith-madmax-landscape'},
    finale:{label:'Finale Furiosa',description:'Sfondo crema, domanda e grande ritaglio in basso.',design:'faith-madmax-final'}
  }}
};

const DEFAULT_VARIANT = { n:'copertina', o:'copertina', c:'copertina', d:'hero', r:'copertina', fd:'copertina', fr:'copertina', fs:'copertina', fg:'copertina', fk:'copertina', fc:'copertina', fm:'copertina' };

