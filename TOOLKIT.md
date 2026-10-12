# Pakartotinai naudojamas programėlių pagrindas

Veikiantis originalas išsaugotas Git žyma `example-v1` (8-oji versija).
`docs/` yra originali programėlė. Biblioteka yra `packages/app-modules/`, švaraus
projekto šaltiniai `starter/`. Katalogas ir naudojimo pavyzdžiai:
[packages/app-modules/README.md](packages/app-modules/README.md).

## Sukurti kitą programėlę

```bash
npm run create-app -- --id mano-app --name "Mano programėlė"
```

Rezultatas: `build/apps/mano-app/`. Tai savarankiškas projektas su `src/`,
`docs/`, `modules/`, build script ir GitHub Pages workflow. `--output` leidžia
parinkti naują katalogą. Esamo katalogo generatorius niekada neperrašo.

Su atskiru API ir DB:

```bash
npm run create-app -- --id kita-app --name "Kita programėlė" \
  --auth --api-url https://kita.example/api \
  --app-url https://kita.example/ --with-server --port 8094
```

Generatorius sukuria naujus privačius raktus, naują DB vardą ir paskyrą bei Docker
projekto vardą. Konteinerius paleisk sugeneruoto projekto README komandomis.
Jis nepaleidžia serverio ir neperkelia demo DB. SMTP išlieka neįjungtas, kol
nenurodai tikro siuntimo ir nepatikrini pristatymo.

Naujam projektui būtina parinkti savo ID. LocalStorage, IndexedDB ir service-worker
cache vardai atskirti pagal app ID; cache taip pat atskirta pagal SW scope.
Kelios programėlės tame pačiame domene nėra saugumo izoliacija: origin bendras.
Jei reikia paskyrų izoliacijos, naudok atskirus programėlių domenus/subdomenus
ir atskirus API, DB bei raktus. Vienas bendras prisijungimas būtų atskiras SSO darbas.

## Eksportuoti į dvi repozitorijas

```bash
npm run export-toolkit
```

Paruošiami `build/app-starter/` ir `build/app-modules/`, taip pat ZIP ir npm TGZ
`build/downloads/`. Galima įkelti šių katalogų turinį į naujų repo šaknį.
`app-starter` GitHub Settings pažymimas kaip Template repository.
`app-modules` gali būti npm Git dependency, pririšta prie konkrečios versijos.
Privačių failų, tikros DB ir testinių programėlių šie archyvai neturi.

Atskiros GitHub repozitorijos dar nesukurtos: dabartinis deploy key suteikia
rašymą tik `europolas/iphoneTest`. Eksportai paruošti be papildomos GitHub prieigos.

## Patikrinimas ir publikavimas

```bash
npm ci
npm test
npx playwright install chromium
npx playwright test
python3 scripts/prepare-pages.py
```

GitHub Pages publikuoja originalą ir šablono peržiūrą `/starter/`; atsisiuntimai
yra `/downloads/`. GitHub Actions tikrina Node modulius ir naršyklę, o esamas
API workflow toliau tikrina originalo paskyrų API su MariaDB.
Sugeneruotas serveris taip pat patikrintas atskiroje testinėje MariaDB instaliacijoje.
Darbalaukio Chromium testai nepakeičia tikro iPhone leidimų, kamerų ir Web Push bandymo.
