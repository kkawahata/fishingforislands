# Fishing For Islands

A roguelike farming sim with charm and mystery. Built with Three.js.

## Quick Start

### One-Time Setup

Install **Node.js** (version 18+). This is the only thing you need.

- **Windows**: Download from https://nodejs.org/ — run the installer, click Next through everything.
- **Mac**: Download from https://nodejs.org/ — or `brew install node` if you use Homebrew.

### Playing the Game

Everything else is included — no other install steps.

**Windows:** Double-click **`start.bat`**

**Mac:** Open Terminal, `cd` to this folder, run **`./start.sh`**

Your browser opens automatically. If not, go to **http://localhost:5173/**

Chrome, Firefox, or Edge recommended.

### Controls

| Input | Action |
|-------|--------|
| **Left Click** (ground) | Move to that location |
| **Left Click** (object/NPC) | Walk to and interact |
| **WASD** | Move (camera-relative) |
| **E** | Interact with nearby object |
| **C** | Open crafting (near a station) |
| **Right-drag** | Orbit camera |
| **Scroll wheel** | Zoom in/out |
| **V** | Reset camera to isometric view |
| **Backtick (`)** | Toggle dev tools panel |
| **Space / Enter** | Advance dialogue |
| **Escape** | Close menus |

### Dev Tools

Press the backtick key (`` ` ``) to open the dev tools panel. This lets you:

- **Skip to Day N** -- jump ahead to test later content
- **Add Items** -- give yourself any resource
- **Unlock All Islands** -- reveal the entire map
- **Give All Tools** -- get every tool instantly
- **Clear Save** -- reset your progress
- **Toggle Flags** -- flip game state flags for testing

### Game Overview

You wake up on a small island carried by a giant Turtle. Each day, a new island floats into view with its own story, characters, and quests.

**Core loop:** Start Day -> Explore New Island -> Complete Quests -> Talk to Turtle -> End Day

The game currently has content through Day 9+ with 15 islands, 35+ quests, and an endgame goal of collecting 5 magical stones.

### Saving

The game auto-saves at the end of each day. Your progress is stored in your browser's local storage. To start fresh, use the dev tools "Clear Save" button and refresh the page.

### Building for Production

To create an optimized build:
```
npm run build
```

The output will be in the `dist/` folder. You can serve it with any static file server:
```
npm run preview
```

### Troubleshooting

- **"node: command not found"** -- Install Node.js from https://nodejs.org/ (one-time setup).
- **Blank screen** -- Try a hard refresh (Ctrl+Shift+R). Check browser console (F12) for errors.
- **Controls feel wrong** -- Press V to reset the camera to the default isometric view.
- **Want to start fresh** -- Press ` to open dev tools, click "Clear Save", then refresh the page.
