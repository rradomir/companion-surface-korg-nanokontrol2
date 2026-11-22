# companion-surface-korg-nanokontrol2

A [Bitfocus Companion](https://bitfocus.io/companion) **surface module** for the **KORG nanoKONTROL2**.

- Buttons press the grid buttons of the page assigned to the surface.
- Button LEDs follow the button background colour.
- Faders and knobs send their values to custom variables (transfer variables), ready for triggers.

Requires Companion **5.1** or newer.

## Install

1. Download the `.tgz` from the [Releases](../../releases) page.
2. In Companion, go to **Modules → Import module package** and choose the file.
3. Connect the nanoKONTROL2. It appears under **Surfaces**.
4. In **KORG KONTROL Editor**, set the device's **LED Mode** to **External**.

Usage and settings are described in [companion/HELP.md](companion/HELP.md), which is also shown inside Companion.

## Build from source

Requires Node.js 26 and Yarn 4 (via corepack).

```sh
yarn install
yarn build
yarn package   # creates korg-nanokontrol2-surface-<version>.tgz
```

## Project layout

| File | Purpose |
|---|---|
| `src/main.ts` | Plugin entry: finds nanoKONTROL2 MIDI ports and opens surfaces |
| `src/instance.ts` | One surface: MIDI input → button presses and variable values, button colour → LEDs |
| `src/device.ts` | CC numbers and grid positions of all controls |
| `src/config.ts` | Surface settings |
| `src/midi.ts` | Small wrapper around `@julusian/midi` |
| `companion/manifest.json` | Companion module manifest |

## License

MIT
