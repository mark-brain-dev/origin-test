# Nexus OS Desktop (Electron)

## Quick Start

### Development (points at your local web server)
```bash
cd electron
npm install
npm run start:dev
```

### Production Build
```bash
cd electron
npm install

# macOS (DMG)
npm run build:mac

# Windows (NSIS installer)
npm run build:win

# Linux (AppImage + deb)
npm run build:linux

# All platforms
npm run build:all
```

## How it works

The Electron wrapper loads the Nexus OS web app running at `http://localhost:18245/nexus` (or `NEXUS_URL` env var). It adds:
- Native window chrome with traffic lights (macOS)
- Native menu bar with keyboard shortcuts
- New Page (⌘N), Settings (⌘,), etc.
- Opens external links in the system browser
- IPC bridge exposed via `window.electronAPI`

## Icon

Place your icon files in `electron/`:
- `icon.png` (512×512) — Linux
- `icon.ico` — Windows  
- `icon.icns` — macOS

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXUS_URL` | `http://localhost:18245/nexus` | URL of Nexus OS web server |
| `NODE_ENV` | — | Set to `development` to enable DevTools |
