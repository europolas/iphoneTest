# Vartotojų API

Veikia `https://perimove.com/iphone-api/`. PWA failai publikuojami GitHub Pages,
o API, MariaDB ir siunčiamo pašto Postfix servisas veikia šiame serveryje.
Git saugomas kodas ir schema. Slaptažodžiai, DB duomenys ir privatūs raktai į Git nepatenka.

## Paskyros ir apsauga

`src/AuthApi.mjs` įgyvendina registraciją, prisijungimą, atsijungimą, profilį,
slaptažodžio keitimą ir atkūrimą bei administratoriaus vartotojų sąrašą ir blokavimą.
Registracija visada sukuria paprastą vartotoją. Administratorius priskiriamas
tik serverio komanda `scripts/set-admin.mjs`, perduodant jau registruotos paskyros el. paštą.

Slaptažodžiai maišomi scrypt su atsitiktine druska. Sesijos galioja 12 valandų;
DB saugoma tik atsitiktinio 256 bitų žetono SHA-256 santrauka. Atkūrimo nuoroda
galioja 30 minučių ir naudojama vieną kartą. Pakeitus slaptažodį arba užblokavus
vartotoją panaikinamos sesijos. Registracijos ir atkūrimo atsakymai neatskleidžia,
ar el. paštas jau registruotas. Yra išliekantys užklausų dažnio ribojimai.

API naudoja SQL parametrus ir DB paskyrą `iphone_app`, kuri gali tik skaityti
ir keisti `iphone_test` duomenis, bet negali keisti schemos ar skaityti sisteminių lentelių.
DB nėra viešo tinklo porto. API portas 8091 pasiekiamas tik per serverio loopback;
nginx perduoda HTTPS užklausas ir perrašo kliento IP. CORS leidžia tik programėlės origin.

Telefone žetonas saugomas `sessionStorage` arba atmintyje, o slaptažodis nesaugomas.
Uždarius programėlę iOS gali pareikalauti prisijungti iš naujo. Skaitiklis lieka
vietinis kiekvieno telefono duomuo, nesinchronizuojamas su paskyra.

## Dabartinė instaliacija

Komandos vykdomos iš repozitorijos šaknies:

```bash
docker compose -f server/compose.yml ps
docker compose -f server/compose.yml build api
docker compose -f server/compose.yml up -d
curl --fail https://perimove.com/iphone-api/health
```

Serverio pakeitimai paleidžiami šiomis komandomis; GitHub Actions automatiškai
publikuoja PWA, bet neperdiegia serverio API. DB saugoma nuolatiniame Docker volume;
`docker compose down -v` ją ištrintų, todėl šios komandos nenaudoti.
Prieš schemos pakeitimus reikia DB atsarginės kopijos. Dabartinė migracija
`compose.migrate.yml` sukuria lenteles ir ribotą DB paskyrą; pakartojama esamai schemai,
bet nėra bendras būsimų schemos pakeitimų migravimo mechanizmas.

Privatūs failai yra `.runtime/` (katalogas 700, failai 600): `db_root`, `db_app`,
`api_secret`, `mail_key`, `smtp_password`, `api.env`, `dkim_private`, `mailtls/`.
Jie perduodami Docker secrets ir aplinkos failu. Compose API UID 1001 atitinka
šio serverio failų savininką; kitame serveryje jį reikia pritaikyti.
Ši instaliacija paruošta esamam serveriui, kitai aplinkai reikia naujų privačių
raktų, sertifikatų ir tinkamo HTTPS nginx konfigūravimo.

## Slaptažodžio atkūrimo paštas

Pašto relay nėra publikuotas internete. API pasiekia jį vidiniame Docker tinkle
per STARTTLS ir tikrina privataus CA sertifikatą. Laiškas pasirašomas DKIM.
Postfix siunčia į gavėjo MX per TLS, tikrindamas viešą sertifikatą.
API išsiuntimo eilėje atkūrimo nuoroda šifruojama AES-256-GCM.
Postfix priėmimas reiškia įtraukimą į jo eilę, ne pristatymą į gavėjo pašto dėžutę.

`mail/DNS-records.json` yra vieši SPF, DKIM ir DMARC įrašai šios instaliacijos
`perimove.com` domenui. DNS valdymo paskyra serveryje nerasta; įrašus dar reikia
pridėti pas domeno valdytoją. Jei naudojamas kitas siuntimo servisas, SPF turi
apimti abu siuntėjus, o ne sukurti antrą SPF įrašą. Taip pat reikia patikrinti
serverio IP atvirkštinį DNS (PTR) ir faktinį laiško pristatymą.

Kol DNS ir pristatymas nepatikrinti, `.runtime/api.env` yra
`MAIL_DELIVERY_READY=false`: atkūrimo API grąžina aiškią 503 klaidą, o registracija
ir prisijungimas veikia. Atlikus pristatymo testą nustatyti `true` ir perkurti API
su `docker compose -f server/compose.yml up -d api`.
Privatus vidinio SMTP TLS sertifikatas galioja 365 dienas; jį reikia atnaujinti
ir paleisti SMTP iš naujo iki galiojimo pabaigos.

## Patikrinimas

```bash
node --test tests/*.test.cjs
docker run --rm --user 1001:1001 --network iphone-test_database \
  --mount type=bind,src="$PWD/server/test",dst=/app/test,readonly \
  --mount type=bind,src="$PWD/.runtime/db_root",dst=/run/secrets/db_root,readonly \
  iphone-test-api node --test test/*.test.mjs
```

Integraciniai testai sukuria atskirą laikiną DB ir ribotą paskyrą, patikrina
atkūrimą, sesijų atšaukimą, teises bei ribojimus ir po to juos pašalina.
Jie nekeičia programėlės vartotojų DB. Tikras iPhone ir laiško pristatymas
dar reikalauja įrenginio bei gavėjo patikrinimo.
