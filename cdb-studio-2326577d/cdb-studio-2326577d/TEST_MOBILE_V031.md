# Test rapido v0.31

## iPhone / telefono

1. Aprire l’app e verificare che la barra **Crea · Rivedi · Esporta** resti in basso senza coprire i pulsanti.
2. In **Crea**, cambiare tra URL, Instagram, JSON e Testo: le quattro sorgenti devono restare su una sola riga.
3. Scorrere la pagina: **Genera bozza completa** deve restare raggiungibile sopra la barra inferiore.
4. In **Rivedi**, aprire e chiudere **Coda di revisione** e **Gestisci la slide**.
5. Attivare **Avanzate**: il dock degli strumenti deve scorrere orizzontalmente.
6. In **Esporta**, verificare che gli export siano in alto e la diagnostica dentro **Strumenti tecnici**.
7. Chiudere e riaprire l’app: deve tornare all’ultimo passaggio principale usato.

## Controlli anti-regressione

- cambio slide, modifica testi, approvazione e duplicazione;
- generazione da JSON;
- apertura progetto portatile;
- export PNG e ZIP;
- PIN locale e blocco app.
