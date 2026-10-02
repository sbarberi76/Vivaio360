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

Il server supporta un accesso amministratore condiviso via autenticazione HTTP Basic: configura ADMIN_USER e ADMIN_PASSWORD (almeno 16 caratteri) nelle variabili del servizio, mai nel codice. NODE_ENV=production impedisce l’avvio senza credenziali. Usa esclusivamente HTTPS per un servizio pubblico. Non include account individuali, ruoli, modifica/eliminazione anagrafiche, esportazione o pagamenti online.

## Demo web senza server

```sh
npm run build:demo
```

Apri `dist/index.html` nel browser: è un file autonomo, senza chiamate al backend o dipendenze esterne. Usa esclusivamente dati inventati. Le modifiche rimangono nel browser (localStorage quando disponibile); il pulsante “Ripristina demo” cancella le modifiche locali e ripristina gli esempi. La demo non sincronizza dati tra utenti o dispositivi.

Per pubblicarla con GitHub Pages, il contenuto di `dist` viene caricato sul branch `gh-pages`. Nel repository apri **Settings → Pages → Build and deployment → Deploy from a branch**, seleziona **gh-pages** e **/(root)**, poi salva. GitHub mostrerà il link dopo la pubblicazione. Questo pubblica solo la demo statica, non il database o il server.

## Deploy del server (opzionale)

Dockerfile e render.yaml preparano un server con disco persistente, autenticazione e health check `/healthz`. Render richiede un piano a pagamento per il disco: non è necessario per la demo GitHub Pages. Configura le credenziali nelle impostazioni sicure dell’hosting, usa HTTPS e pianifica i backup prima di inserire dati reali.
