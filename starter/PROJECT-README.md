# Naujos programėlės pagrindas

Redaguok `src/app.config.json`, savo ekranus kurk `src/index.html` ir `src/app.js`.
`modules/` yra konkrečios bendros bibliotekos versijos kopija. Kiekviena programėlė
turi unikalų `id`; naudojamos atskiros vietinės saugyklos, DB ir Docker projekto vardai.

```bash
npm run build
npm start
```

Atidaryk `http://localhost:4173/`. Publikuojami tik `docs/` failai.
GitHub repozitorijoje įjunk Settings → Pages → Source → GitHub Actions.
Įkėlus į `main`, workflow perkuria ir publikuoja PWA.
Serverio API automatiškai šis workflow neperdiegia.

Pavyzdinė schema ir serveris yra tik projektuose, sugeneruotuose su `--with-server`.
Frontend paskyros įjungiamos konfigūracijos `features.auth=true`, nurodžius savo `apiUrl`.
Mūsų demo API ir jo vartotojai į naują projektą neperkeliami.

## Pasirenkamas serveris

Generatorius `.runtime/` sukūrė privačius failus (katalogas 700, failai 600).
Jų nekopijuok į Git ir nepublikuok kartu su `docs/`. UID/GID nustatyti serveriui,
kuriame generatorius buvo paleistas; perkeliant serverį reikia juos pritaikyti.
Kiekvienai programėlei parink atskirą `API_PORT` `.runtime/compose.env`.

```bash
docker compose --env-file .runtime/compose.env -f server/compose.yml up -d db
docker compose --env-file .runtime/compose.env -f server/compose.yml run --rm migrate
docker compose --env-file .runtime/compose.env -f server/compose.yml up -d api
```

API portas atvertas tik localhost. Savo HTTPS nginx route turi perduoti užklausas
į šį portą ir perrašyti X-Real-IP. MariaDB nėra viešo porto. Programėlės DB
paskyra neturi DDL ar sisteminių lentelių teisių.

Serverio `schema.sql` yra pirmoji migracija. Ji registruojama DB su kontroline suma.
Pridėdamas schemos pakeitimą sukurk naują migracijos ID; jau pritaikyto SQL nekeisk.
MariaDB DDL nėra atominių transakcijų dalis: prieš migraciją pasidaryk DB atsarginę
kopiją ir naujos migracijos pakartojimo strategiją patikrink testinėje DB.
Docker volume yra išliekantis saugojimas, ne atsarginė kopija. `down -v` ištrina DB.

Administratorius gali būti priskirtas jau registruotam vartotojui:

```bash
docker compose --env-file .runtime/compose.env -f server/compose.yml run --rm admin tavo@email.example
```

SMTP yra išorinis, pasirenkamas: `.runtime/api.env` nustatyk SMTP_HOST, PORT,
USER, FROM, o slaptažodį įrašyk į `.runtime/smtp_password`. TLS sertifikatai tikrinami.
`MAIL_DELIVERY_READY=true` įjunk tik patikrinęs realų laiško pristatymą.
Iki tol atkūrimo API grąžina 503 ir nežada neišsiųsto laiško.
Registracijos, atkūrimo, slaptažodžio keitimo, profilio ir blokavimo funkcijos yra;
El. pašto patvirtinimas ir MFA šiame modulyje dar neįgyvendinti. Paskyros ištrynimas reikalauja dabartinio slaptažodžio ir aiškaus patvirtinimo.

## Modulių naudojimas

Naršyklėje importuok konkretų modulį iš `./modules/…` publikuotame projekte,
arba iš `modules/src/…` savo šaltinio įrankiuose. Bendro paketo dokumentacija
yra `modules/README.md`. Jo versija – `modules/package.json`.

Pranešimus, kamerą, vietą ir bendrinimą paleisk po vartotojo paspaudimo.
Leidimų palaikymas priklauso nuo naršyklės. ntfy adapteris tinka viešiems
bandomiesiems pranešimams, o produkcijos pranešimams rekomenduojamas autentifikuotas
jūsų serverio siuntimas. Failų įkėlimo ir CRUD moduliai yra API klientai:
jiems reikia jūsų serverio atitinkamų endpointų ir teisių tikrinimo.

Atnaujinimai laukia vartotojo veiksmo. Savo formų neišsaugotą būseną įtrauk į
`canReload`. iPhone ekrano, klaviatūros ir blur pataisos perimtos iš veikiančio demo.
PWA yra internetinė programėlė; tai nėra pasirašytas iOS IPA projektas.

## Agent handoff and language defaults

Read `AGENTS.md` and `modules/docs/ARCHITECTURE.md` before changing the app.
English (`en`) is default, Lithuanian (`lt`) is the second option. Saved preferences
are preserved. Dictionaries live in `modules/src/translations/en.js` and `lt.js`.
See `modules/docs/LOCALIZATION.md` for labels, messages, dialogs and formatting.
