# Colour Block

A colourful, addictive block puzzle game built with vanilla **HTML5**, **CSS3**, and **ES6 JavaScript modules**. No build step, no backend, no npm. Runs directly on GitHub Pages.

## Play

- Drag a block from the tray onto the board.
- Complete full horizontal or vertical lines to clear them.
- Clear multiple lines in a row to stack combos.
- Game over when no block fits — unless you're playing Endless.

## Modes

| Mode | Description |
|---|---|
| **Classic** | 8×8 board, no timer, game over when nothing fits. 3 skips. |
| **Endless** | Same rules, but when stuck the bottom row auto-clears. No game over. |
| **Time** | 120-second challenge. 1 skip. |
| **Levels** | Progressive score targets. Beat a target to advance. |
| **Daily** | Seeded by today's date — everyone gets the same block sequence. |

## Features

- Fully responsive: desktop, tablet, iPhone, Android.
- Touch-friendly drag and drop (Pointer Events API).
- Animated splash, menu, particles, combo popups, clear effects.
- Web Audio synthesised sound effects (zero audio files to load).
- LocalStorage persistence: best scores, settings, statistics.
- Colour system: red, blue, green, yellow, purple, orange, pink, cyan — each with 3D gradient and shadow.

## Deploy to GitHub Pages

### 1. Create the repository

```bash
git init
git add .
git commit -m "Colour Block"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
