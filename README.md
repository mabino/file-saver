# File Saver: System Overload

A small browser game. Move the folder to catch files by color. Features:

- MVC split: model.js, view.js, controller.js
- Splash screen with difficulty and color selection
- Color-cycling (Q/E) and mouse control
- Difficulty presets (easy/medium/hard/crazy)
- Web Audio for gapless loop and end-game sound

How to run locally

1. Open `file-saver.html` in a browser (double-click). If audio is blocked, click START on the splash screen.
2. Or serve locally then open http://localhost:8000:
   - Python: `python -m http.server 8000`
   - Node: `npx http-server -c-1 .`

Controls

- Move: mouse or ← → / A D
- Cycle catch color: Q / E
- Start: click START on the splash screen
- Reboot: click REBOOT SYSTEM to stop the game and return to splash

GitHub Pages

This repository attempts to enable GitHub Pages automatically after pushing. If Pages isn't enabled, go to the repository Settings → Pages and set the source to the `main` branch and `/ (root)`.

Notes

- Audio files `file-saver.mp3` and `end-game.mp3` are used; keep them in the repo root.

Generated on: 2025-12-29T23:41:24Z
