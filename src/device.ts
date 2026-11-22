// nanoKONTROL2 factory "CC mode" scene, laid out for the Companion grid.
// If the user changes CC numbers in KORG KONTROL Editor, only this table needs updating.

export interface ButtonDef {
	/** Control id used by Companion. Never rename (breaks surface layout assignments). */
	id: string
	cc: number
	hasLed: boolean
	row: number
	column: number
}

export interface AnalogDef {
	/** Also the transfer variable id. */
	id: string
	label: string
	kind: 'fader' | 'knob'
	cc: number
}

const buttons: ButtonDef[] = []
const analogs: AnalogDef[] = []

// Channel strips: one column per channel, S / M / R stacked like on the device.
for (let i = 0; i < 8; i++) {
	const n = i + 1
	buttons.push({ id: `solo${n}`, cc: 32 + i, hasLed: true, row: 0, column: i })
	buttons.push({ id: `mute${n}`, cc: 48 + i, hasLed: true, row: 1, column: i })
	buttons.push({ id: `rec${n}`, cc: 64 + i, hasLed: true, row: 2, column: i })
	analogs.push({ id: `fader${n}`, label: `Fader ${n}`, kind: 'fader', cc: 0 + i })
	analogs.push({ id: `knob${n}`, label: `Knob ${n}`, kind: 'knob', cc: 16 + i })
}

// Row 3: transport + track. Row 4: markers.
const transport: Array<[id: string, cc: number, hasLed: boolean, row: number, column: number]> = [
	['rewind', 43, true, 3, 0],
	['forward', 44, true, 3, 1],
	['stop', 42, true, 3, 2],
	['play', 41, true, 3, 3],
	['record', 45, true, 3, 4],
	['cycle', 46, true, 3, 5],
	// Control ids may only contain [a-zA-Z0-9-/] (layout schema) - hence dashes, not underscores.
	['track-prev', 58, false, 3, 6],
	['track-next', 59, false, 3, 7],
	['marker-set', 60, false, 4, 0],
	['marker-prev', 61, false, 4, 1],
	['marker-next', 62, false, 4, 2],
]
for (const [id, cc, hasLed, row, column] of transport) buttons.push({ id, cc, hasLed, row, column })

export const BUTTONS: readonly ButtonDef[] = buttons
export const ANALOGS: readonly AnalogDef[] = analogs
export const BUTTON_BY_CC = new Map(BUTTONS.map((b) => [b.cc, b]))
export const BUTTON_BY_ID = new Map(BUTTONS.map((b) => [b.id, b]))
export const ANALOG_BY_CC = new Map(ANALOGS.map((a) => [a.cc, a]))
