# Test diagnostica v0.31

1. Apri l’app via HTTPS e sblocca il PIN.
2. Vai in **Esporta → Strumenti tecnici → Diagnostica app**.
3. Premi **Esegui diagnostica**.
4. Verifica che il rapporto distingua `pass`, `warn`, `fail` e `info`.
5. Prova **Copia rapporto** e **Salva rapporto**.
6. Con una chiave TMDb valida, il test TMDb deve risultare operativo; senza chiave deve essere informativo, non errore.
7. Con una foto remota sulla slide, il test deve indicare se il server consente l’incorporamento CORS.
8. Premi **Aggiorna cache app** e riapri l’app.

Il test non modifica il progetto, salvo una scrittura temporanea in IndexedDB che viene immediatamente cancellata.
