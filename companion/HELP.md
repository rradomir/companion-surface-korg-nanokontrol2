## KORG nanoKONTROL2 (surface)

Uses a KORG nanoKONTROL2 as a Companion surface:

- **Buttons** press the grid buttons of the page shown on this surface.
- **LEDs** follow the button background colour: lit when it is not black (for example, a button turned red by an OBS feedback).
- **Faders and knobs** send their value to custom variables. Use them in triggers ("on variable change").

### Device setup

In **KORG KONTROL Editor**, set **LED Mode = External**, and write the scene to the device. Otherwise the device controls the LEDs itself and Companion can't change them.

The module expects the factory CC assignments (the default scene).

### Button layout on the page

| Row | Columns 1–8 |
|-----|-------------|
| 1 | Solo 1–8 |
| 2 | Mute 1–8 |
| 3 | Rec 1–8 |
| 4 | Rewind, Forward, Stop, Play, Record, Cycle, Track ◀, Track ▶ |
| 5 | Marker Set, Marker ◀, Marker ▶ |

Track ◀ ▶ and the marker buttons have no LED.

### Faders and knobs

1. Create one custom variable for each control you want to use (**Variables → Custom variables**).
2. Open the surface settings (**Surfaces → nanoKONTROL2**). At the bottom, pick a variable for each fader and knob.
3. Make a trigger with the event **"on variable change"** that uses the variable, for example to set an OBS source volume.

### Settings

| Setting | Meaning |
|---|---|
| MIDI channel | Global MIDI channel of the device (default 1) |
| Value format | One format for all faders and one for all knobs, or a separate format for each control |
| Formats | **dB** (uses the range below, good for OBS/ATEM volume), **Percent** 0–100, **Normalized** 0–1, **Raw MIDI** 0–127, **Pan** −100 to 100 |
| Fader/knob update interval | Minimum time between two values of one control (ms). Raise it if triggers report "rate limited". |
| dB at bottom / top | Range used by the dB format |
| LED on above brightness | How bright the button colour must be for the LED to light (0–255) |

Note: Companion 5.1.0 shows all format fields, even the ones that don't apply. Each field label says when it is used.
