# Contribuer à À cours sûr

Merci de vouloir améliorer le projet. La priorité est de conserver une application Windows simple, locale et fiable pour les étudiants.

## Avant de commencer

- ouvrez une issue pour une évolution importante ;
- gardez chaque pull request courte et centrée sur un seul sujet ;
- ne commitez jamais de clé API, d’enregistrement, de base SQLite ou de modèle Whisper ;
- ne rendez pas l’enregistrement dépendant du réseau, de Whisper ou d’un fournisseur d’IA.

## Installation

```powershell
git clone https://github.com/janjawish/a-cours-sur.git
cd a-cours-sur
npm install
npm run setup:whisper
npm run tauri dev
```

## Contrôles avant une pull request

```powershell
npm run check
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

Décrivez ensuite ce qui change, comment le tester et, pour une modification visuelle, ajoutez une capture d’écran.
