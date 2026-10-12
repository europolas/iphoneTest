# Nemokama bandomoji iPhone programėlė

Veikiantis 8-osios versijos pavyzdys išsaugotas Git žyma `example-v1`.
Pakartotinai naudojamo pagrindo, 39 modulių ir naujo projekto generatoriaus
instrukcijos: [TOOLKIT.md](TOOLKIT.md). Šablono peržiūra publikuojama
https://europolas.github.io/iphoneTest/starter/.

SwiftUI skaitiklis: paspausk mygtuką, padidink skaičių arba pradėk iš naujo.
Skaičius saugomas telefone. Paskyros naudoja atskirą mūsų serverio API. Mokamos Apple Developer narystės nereikia.
Palaikoma iOS 17 ir naujesnė; programėlė skirta iPhone, įskaitant iPhone 17.

## Jei turi tik iPhone: internetinė versija

`docs/` aplanke yra to paties skaitiklio internetinė versija. Ji saugo skaičių
naršyklėje ir, po pirmojo sėkmingo užkrovimo, palaiko veikimą be interneto.
Tai PWA, o ne sukompiliuota iOS programėlė.

Norėdamas ją publikuoti per GitHub Pages, repozitorijoje atidaryk
**Settings → Pages → Build and deployment → Source → GitHub Actions**.
Po to **Actions → Deploy web app → Run workflow** paleisk pirmą publikavimą.
Adresas po sėkmingo publikavimo: https://europolas.github.io/iphoneTest/

GitHub Free plane Pages nemokamai palaikoma viešoms repozitorijoms. Jei ši
repozitorija privati ir GitHub neleidžia įjungti Pages, reikės ją padaryti viešą
arba rinktis kitą talpinimą. Šiame projekte nėra prisijungimo duomenų.

Telefone atidaryk publikuotą adresą per Safari ir pasirink
**Bendrinti → Pridėti prie pradžios ekrano**. Įdiegtai internetinei versijai
nereikia Apple Developer narystės, kompiuterio ar kas 7 dienas atnaujinamo parašo.

### Automatiniai atnaujinimai

Įkėlus internetinės programėlės pakeitimus į `main`, `Deploy web app` juos
patikrina ir publikuoja. Kiekvienas pasikeitęs failų rinkinys gauna naują
talpyklos versiją. Telefone programėlė tikrina atnaujinimus ją atidarius,
grįžus į ją, atkūrus internetą ir kas minutę, kol ji matoma.
Sėkmingai atsisiuntusi visus naujos versijos failus, ji automatiškai persikrauna.
Išsaugotas skaičius lieka. Be interneto toliau veikia ankstesnė versija.
Uždaryta programėlė iOS fone nuolat netikrina atnaujinimų; patikrins ją atidarius.

Šis mechanizmas taikomas internetinei versijai. Tikros iOS `.ipa` programėlės
pasirašymas ir diegimas telefonu lieka atskiras procesas.

### Vienkartinis pranešimas po minutės

Atidaryk programėlę per pradžios ekrano ikoną, pažymėk „Vienas pranešimas po
1 min.“ ir leisk pranešimus. Tik gavusi sėkmingą siuntimo paslaugos atsakymą
programėlė parodo, kad priminimas suplanuotas. Tuomet ją gali uždaryti.
Vienas bandymas suplanuoja vieną pranešimą. Atžymėjus langelį nutraukiama
to įrenginio prenumerata laukiantiems priminimams; jau pristatyto pranešimo
atšaukti negalima. Po minutės langelį galima pažymėti dar kartą naujam bandymui.

Naudojama ntfy.sh nemokama viešoji Web Push ir uždelsto siuntimo paslauga.
Kiekvienam bandymui sukuriamas atskiras atsitiktinis kanalas. Paslaugai perduodamas
įrenginio push prenumeratos adresas, šifravimo viešieji duomenys ir bandomasis
pranešimas. Neperduodami Apple prisijungimo duomenys ar skaitiklio reikšmė.
Kanalai nėra paskyra apsaugoti: šis variantas skirtas viešam bandomajam tekstui,
o ne konfidencialiems pranešimams. Paslaugos ribos ir tinklas gali lemti vėlavimą;
viena minutė nėra tikslaus pristatymo garantija.

Pranešimo tekste naudojama „Praėjo viena minutė! Tavo bandomasis pranešimas
atkeliavo.“ Pridedama programėlės ikona ir paveikslėlis. iOS Web Push nerodo
atskiro didelio paveikslėlio visose versijose; jį taip pat galima pamatyti
paspaudus pranešimą ir atidarius programėlę.

Viešą programėlės nuorodą galima siųsti kitiems: kiekvienas ją prideda į savo
pradžios ekraną ir atskirai suteikia pranešimų leidimą. App Store nereikia.

## Paskyros ir serverio API

Internetinėje programėlėje yra registracija, prisijungimas, atsijungimas, vardo
bei slaptažodžio keitimas ir atkūrimo formos. API veikia
`https://perimove.com/iphone-api/`, duomenys saugomi mūsų serverio MariaDB.
Privatūs prisijungimo duomenys į Git nekeliami. Administratoriaus paskyrai
yra vartotojų sąrašas ir blokavimas. Slaptažodžio atkūrimo siuntimas bus įjungtas
sutvarkius domeno pašto DNS įrašus ir patikrinus pristatymą.

Diegimas, saugumo priemonės ir serverio testai: [server/README.md](server/README.md).
Paskyrų funkcijos įgyvendintos PWA; SwiftUI skaitiklio projektas jų neturi.

## 1. Įkelk projektą į GitHub

Sukurk viešą repozitoriją. Standartiniai GitHub Actions vykdytojai viešose
repozitorijose nemokami: https://docs.github.com/en/billing/concepts/product-billing/github-actions

Įkelk visus projekto failus, įskaitant paslėptą `.github` aplanką.
Jei naudoji Git terminale, projekto aplanke vykdyk:

```bash
git init
git add .
git commit -m "Add iPhone demo and GitHub build"
git branch -M main
git remote add origin https://github.com/TAVO-VARDAS/TAVO-REPO.git
git push -u origin main
```

Pakeisk `TAVO-VARDAS/TAVO-REPO` savo repozitorijos adresu.

## 2. Parsisiųsk sukompiliuotą paketą

GitHub atidaryk **Actions → Build iOS IPA**. Kompiliavimas prasideda įkėlus kodą
į `main`; galima paleisti ir per **Run workflow**.
Kai vykdymas bus žalias, jo apačioje, **Artifacts**, parsisiųsk
**DemoApp-unsigned**. Išskleisk ZIP: viduje bus `DemoApp-unsigned.ipa`.
Artefaktas saugomas 3 dienas; prireikus paleisk kompiliavimą dar kartą.

Tai nepasirašytas tikram iPhone skirtas paketas. Vien jo atidaryti telefone
neužtenka: kitame žingsnyje Sideloadly pasirašys jį tavo kompiuteryje.
Apple prisijungimo duomenų į GitHub kelti nereikia.

## 3. Įdiek per Sideloadly (Windows arba macOS)

1. Atsisiųsk Sideloadly iš https://sideloadly.io/ ir laikykis savo OS diegimo
   instrukcijos. Windows sistemoje įdiek ir svetainėje nurodytus Apple komponentus.
2. Prijunk iPhone USB laidu, atrakink ir patvirtink **Trust This Computer**.
3. Sideloadly pasirink savo telefoną ir įkelk `DemoApp-unsigned.ipa`.
4. Prisijunk su nemokama Apple paskyra ir spausk **Start**. Prisijungimą bei
   dviejų veiksnių patvirtinimą atlik savo kompiuteryje; duomenų nesiųsk į pokalbį.
5. Jei telefonas paprašo, **Settings → General → VPN & Device Management**
   patvirtink savo kūrėjo profilį.
6. Įjunk **Settings → Privacy & Security → Developer Mode**, perkrauk telefoną
   ir patvirtink įjungimą. Jei punkto dar nėra, pirmiausia atlik diegimo bandymą.
7. Atidaryk **Mano Demo** telefone.

Nemokamas pasirašymas galioja **7 dienas**, vienu metu leidžiamos iki **3**
tokiu būdu įdiegtų programėlių. Po 7 dienų pasirašyk ir įdiek iš naujo arba
naudok Sideloadly automatinį atnaujinimą su pasiekiamu kompiuteriu.
Atnaujindamas naudok tą pačią Apple paskyrą ir programėlės identifikatorių.
Šaltinis ir trikčių sprendimas: https://sideloadly.io/faq.html

## Patikrinimas telefone

- Paspausk mygtuką tris kartus: skaičius turi būti 3.
- Uždaryk ir vėl atidaryk programėlę: skaičius turi išlikti.
- Spausk „Pradėti iš naujo“: skaičius turi tapti 0.

Projektas paruoštas kompiliuoti GitHub macOS aplinkoje. Šioje Linux darbo
aplinkoje Xcode nėra, todėl tikrą iOS kompiliavimą turi patikrinti GitHub Actions;
įdiegimas tikrame iPhone dar nepatikrintas.

Agent handoff: [AGENTS.md](AGENTS.md), [architecture and guides](packages/app-modules/docs/ARCHITECTURE.md).
Reusable apps default to English and support Lithuanian as the second language.
