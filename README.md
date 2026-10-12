# Nemokama bandomoji iPhone programėlė

SwiftUI skaitiklis: paspausk mygtuką, padidink skaičių arba pradėk iš naujo.
Skaičius saugomas telefone. Nereikia serverio ar mokamos Apple Developer narystės.
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
