# Historique des versions

## 0.1.2 — 2026-09-02

- corrige définitivement l’écran blanc sur les machines où Windows bloque le renderer WebView2 ;
- valide le chargement de l’interface Tauri de production ;
- valide la fermeture native tout en finalisant l’audio en cours ;
- conserve la détection automatique de Whisper installé par le script.

## 0.1.1 — 2026-09-02

- corrige la fenêtre blanche provoquée par un plantage GPU de WebView2 avec le rendu WARP ;
- corrige la fermeture de l’application dans cette situation ;
- détecte automatiquement Whisper dans le dossier créé par le script d’installation ;
- améliore la commande PowerShell du README.

## 0.1.0 — 2026-09-02

Première version publique Windows de **À cours sûr**.

### Inclus

- organisation des semestres, matières et cours ;
- enregistrement microphone résilient en WAV ;
- transcription locale avec whisper.cpp ;
- notes et marqueurs horodatés ;
- lecteur audio synchronisé ;
- recherche locale SQLite FTS5 ;
- résumé, fiche de révision, flashcards et quiz via Gemini ;
- clé Gemini protégée par le Gestionnaire d’identifiants Windows ;
- installateurs EXE et MSI Windows x64.

### À savoir

- l’installateur n’est pas encore signé ;
- le script `install-whisper.ps1` installe séparément la distribution officielle whisper.cpp ;
- Gemini reste facultatif et CodexProvider n’est pas encore activé.
