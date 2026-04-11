# Fishing For Islands

A roguelike farming sim with charm and mystery.

## Play

**https://kkawahata.github.io/fishingforislands/**

Open the link in Chrome, Firefox, or Edge. No install needed.

## Controls

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
| **Space / Enter** | Advance dialogue |
| **Escape** | Close menus |

## Game Overview

You wake up on a small island carried by a giant Turtle. Each day, a new island floats into view with its own story, characters, and quests.

**Core loop:** Start Day -> Explore New Island -> Complete Quests -> Talk to Turtle -> End Day

The game currently has content through Day 9+ with 15 islands, 35+ quests, and an endgame goal of collecting 5 magical stones.

### Saving

The game auto-saves at the end of each day in your browser. To start fresh, press **`** (backtick) to open dev tools and click "Clear Save", then refresh.

## Dev Tools

Press the **backtick key (`)** to open the dev tools panel:

- **Skip to Day N** -- jump ahead to test later content
- **Add Items** -- give yourself any resource
- **Unlock All Islands** -- reveal the entire map
- **Give All Tools** -- get every tool instantly
- **Clear Save** -- reset your progress
- **Toggle Flags** -- flip game state flags for testing

## Development

Requires Node.js 18+.

```
npm install
npm run dev
```

Pushes to `main` auto-deploy to GitHub Pages.
