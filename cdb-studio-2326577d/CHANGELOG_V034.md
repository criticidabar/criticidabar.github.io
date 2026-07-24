# CdB Studio v0.34 — export Affinity e font CdB

## Modifiche

- aggiunto Nickel Gothic v3 Regular come asset locale e offline;
- Nickel Gothic v3 è il font predefinito per i nuovi titoli, testi secondari e testi liberi;
- rimossa la conversione automatica di Nickel Gothic in Anton;
- aggiunto Nickel Gothic al selettore dei font e alla diagnostica;
- rinominato l’export modificabile in **SVG per Affinity**;
- titolo, corpo e testi liberi vengono esportati come elementi `<text>` diretti con righe `<tspan>`;
- eliminate per questi testi le due nidificazioni SVG usate per trasformazione e larghezza;
- assegnati nomi leggibili agli elementi principali dello SVG;
- Nickel Gothic viene incorporato nel file SVG esportato;
- l’export dichiara famiglia, dimensione e peso come attributi SVG espliciti, compatibili con l’importatore di Affinity;
- aggiunto `assets/logo.svg`, ricostruito con forme vettoriali e testo Nickel Gothic;
- anteprima, Canvas ed export usano il logo SVG, mantenendo `logo.png` come fallback;
- lo SVG per Affinity incorpora il logo come due tracciati e due testi, senza immagini raster;
- ridotte dimensioni e area occupata dal logo nelle copertine e slide corpo classiche, eliminando la sovrapposizione con la prima riga del titolo;
- esteso il controllo qualità a tutte le slide: rileva geometricamente le sovrapposizioni tra logo, titolo, testo e testi liberi anche dopo spostamenti, scale e rotazioni;
- il pacchetto completo usa gli stessi SVG ottimizzati per Affinity;
- aggiornati versione, cache PWA e documentazione di pubblicazione.

## Compatibilità

- i progetti esistenti che usano Anton continuano a usare Anton;
- i riferimenti legacy a Nickel Gothic vengono normalizzati al font reale, non più ad Anton;
- PNG, PDF, SVG fedele, `.cdb.json` e `.cdbproject.zip` non cambiano formato.

## Limiti noti

- i font opzionali Google non vengono incorporati nello SVG: Nickel Gothic è l’unico font brand incluso localmente;
- Affinity deve avere Nickel Gothic v3 installato sul sistema: Affinity ignora il webfont incorporato e usa gli attributi SVG per risolvere il font locale;
- la verifica conclusiva della struttura dei livelli deve essere ripetuta in Affinity sul campione v0.34.
