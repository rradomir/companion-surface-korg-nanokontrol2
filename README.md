# companion-surface-korg-nanokontrol2

A [Bitfocus Companion](https://bitfocus.io/companion) **surface module** for the **KORG nanoKONTROL2**.

## Important note

This is **pure vibecoded** package in Claude Code Opus 5.5. I tested it on real hardware, and tried my best in prompting, to have nice result. Remember: it is possible to use this device only by generic midi plugin, which companion already have. This package only introduces user-friendly layout over buttons page, with actions and feedbacks for LEDs. You don't need to think about midi channels, controls etc. Everything is ready to go.

## Tested on:
Companion 5.1.0 and 5.1.3
Windows 11
Mac mini M6 & macOS Golden Gate 27.2

## Blank page included
[`blank_nano_page.companionconfig`](blank_nano_page.companionconfig) is ready page to import, with buttons descriptions. Of course you can put there what you want - it is visible only on admin page. Yet I think it good enough to know where is what button mapped. Claude says it's impossible to include blank page in package you import into companion. That's why you need to do it manually. It was exported from Companion 5.1.3.

- Buttons press the grid buttons of the page assigned to the surface.
- Button LEDs follow the button background colour.
- Faders and knobs send their values to custom variables (transfer variables), ready for triggers.

Requires Companion **5.1** or newer. This is version I tested it. Maybe it will work on earlier.

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
