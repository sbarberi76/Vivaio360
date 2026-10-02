# Vivaio360

Prima versione web in italiano per la gestione di una scuola calcio.

## Avvio

Richiede Node.js 24 o successivo. Nessuna dipendenza esterna e nessun servizio da configurare.

```sh
npm ci
npm start
```

Il server ascolta su `127.0.0.1:3000`. `npm run dev` abilita il riavvio automatico quando cambia il server. `PORT` e `HOST` personalizzano l'ascolto; non esporre il servizio su Internet senza aggiungere autenticazione e protezioni per l'accesso.

## Funzioni

- Squadre e categorie.
- Atleti con data di nascita, genitore/tutore e telefono.
- Allenamenti con data e campo; registro presente/assente per gli atleti della squadra.
- Quote con importo, scadenza e registrazione o annullamento del pagamento.
- Panoramica con conteggi, prossimi allenamenti e quote da incassare.

I dati partono vuoti: crea una squadra, poi un atleta, un allenamento e una quota. I pagamenti sono registrazioni amministrative, non transazioni bancarie.

## Dati e verifica

SQLite salva automaticamente in `data/vivaio360.sqlite` (cartella esclusa da Git). `DB_PATH` permette un percorso diverso. Conserva backup del database a server arrestato. Non inserire dati reali di minori in un ambiente condiviso.

```sh
npm test
```

Il test usa un database temporaneo separato, prova l'intero flusso HTTP, le validazioni e la persistenza dopo riavvio. Non modifica i dati dell'applicazione.

Questa è una prima versione locale: non include account, ruoli, modifica/eliminazione anagrafiche, esportazione o pagamenti online. Prima dell'uso reale occorre prevedere controllo accessi, HTTPS, backup e gestione dei dati personali.
