import type { SomeCompanionInputField } from '@companion-surface/base'
import { ANALOGS, type AnalogDef } from './device.js'

export type FaderFormat = 'db' | 'pct' | 'norm' | 'raw' | 'pan'
const FORMATS: readonly FaderFormat[] = ['db', 'pct', 'norm', 'raw', 'pan']

export type FormatMode = 'shared' | 'each'

export interface SurfaceConfig {
	channel: number
	/** 'shared' = faderFormat/knobFormat for all; 'each' = per-control `format_<id>` fields. */
	formatMode: FormatMode
	faderFormat: FaderFormat
	knobFormat: FaderFormat
	/** Per-control formats, keyed by analog id (only used in 'each' mode). */
	formats: Record<string, FaderFormat>
	dbMin: number
	dbMax: number
	ledThreshold: number
	/** Minimum time between two values of one fader/knob sent to Companion (0 = no limit). */
	analogIntervalMs: number
}

const defaultFormat = (a: AnalogDef): FaderFormat => (a.kind === 'fader' ? 'db' : 'pct')

export const DEFAULT_CONFIG: SurfaceConfig = {
	channel: 1,
	formatMode: 'shared',
	faderFormat: 'db',
	knobFormat: 'pct',
	formats: Object.fromEntries(ANALOGS.map((a) => [a.id, defaultFormat(a)])),
	dbMin: -100,
	dbMax: 0,
	ledThreshold: 16,
	analogIntervalMs: 50,
}

const asFormat = (v: unknown, def: FaderFormat): FaderFormat =>
	FORMATS.includes(v as FaderFormat) ? (v as FaderFormat) : def

export function normalizeConfig(raw: Record<string, unknown> | undefined): SurfaceConfig {
	const r = raw ?? {}
	const num = (v: unknown, def: number) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : def)
	return {
		channel: Math.min(Math.max(Math.round(num(r.channel, 1)), 1), 16),
		formatMode: r.formatMode === 'each' ? 'each' : 'shared',
		faderFormat: asFormat(r.faderFormat, DEFAULT_CONFIG.faderFormat),
		knobFormat: asFormat(r.knobFormat, DEFAULT_CONFIG.knobFormat),
		formats: Object.fromEntries(ANALOGS.map((a) => [a.id, asFormat(r[`format_${a.id}`], defaultFormat(a))])),
		dbMin: num(r.dbMin, DEFAULT_CONFIG.dbMin),
		dbMax: num(r.dbMax, DEFAULT_CONFIG.dbMax),
		ledThreshold: Math.min(Math.max(num(r.ledThreshold, DEFAULT_CONFIG.ledThreshold), 0), 255),
		analogIntervalMs: Math.min(Math.max(Math.round(num(r.analogIntervalMs, DEFAULT_CONFIG.analogIntervalMs)), 0), 1000),
	}
}

/** Format used for one analog control, honouring shared/each mode. */
export function formatFor(cfg: SurfaceConfig, a: AnalogDef): FaderFormat {
	if (cfg.formatMode === 'each') return cfg.formats[a.id] ?? defaultFormat(a)
	return a.kind === 'fader' ? cfg.faderFormat : cfg.knobFormat
}

const FORMAT_CHOICES = [
	{ id: 'db', label: 'dB (range below) - for OBS / ATEM volume' },
	{ id: 'pct', label: 'Percent 0-100' },
	{ id: 'norm', label: 'Normalized 0-1' },
	{ id: 'raw', label: 'Raw MIDI 0-127' },
	{ id: 'pan', label: 'Pan -100 to 100' },
]

export const CONFIG_FIELDS: SomeCompanionInputField[] = [
	{
		id: 'info',
		type: 'static-text',
		label: 'nanoKONTROL2',
		value:
			'Buttons press the grid buttons of the page this surface shows. A button LED is lit when its grid button background is not black ' +
			'(e.g. turned red by an OBS feedback). Device LED Mode must be External (KORG KONTROL Editor). ' +
			'Faders and knobs: pick a custom variable for each one below, then use it in a trigger ("on variable change").',
	},
	{ id: 'channel', type: 'number', label: 'MIDI channel', default: DEFAULT_CONFIG.channel, min: 1, max: 16 },
	{
		id: 'formatMode',
		type: 'dropdown',
		label: 'Value format',
		default: DEFAULT_CONFIG.formatMode,
		choices: [
			{ id: 'shared', label: 'One format for all faders, one for all knobs' },
			{ id: 'each', label: 'Set format for each fader / knob' },
		],
	},
	{
		id: 'faderFormat',
		type: 'dropdown',
		label: 'All faders (only with "One format for all")',
		default: DEFAULT_CONFIG.faderFormat,
		choices: FORMAT_CHOICES,
		isVisibleExpression: `$(options:formatMode) != 'each'`,
	},
	{
		id: 'knobFormat',
		type: 'dropdown',
		label: 'All knobs (only with "One format for all")',
		default: DEFAULT_CONFIG.knobFormat,
		choices: FORMAT_CHOICES,
		isVisibleExpression: `$(options:formatMode) != 'each'`,
	},
	{
		id: 'analogIntervalMs',
		type: 'number',
		label: 'Fader/knob update interval (ms, 0 = every change)',
		default: DEFAULT_CONFIG.analogIntervalMs,
		min: 0,
		max: 1000,
	},
	{ id: 'dbMin', type: 'number', label: 'dB at bottom (silence)', default: DEFAULT_CONFIG.dbMin, min: -200, max: 0 },
	{ id: 'dbMax', type: 'number', label: 'dB at top', default: DEFAULT_CONFIG.dbMax, min: -60, max: 30 },
	{
		id: 'ledThreshold',
		type: 'number',
		label: 'LED on above brightness (0-255)',
		default: DEFAULT_CONFIG.ledThreshold,
		min: 0,
		max: 255,
	},
	// Per-control formats go last, so they sit right above Companion's transfer variable pickers
	// (rendered by Companion after all config fields, in the same Fader 1..8, Knob 1..8 order).
	...ANALOGS.map(
		(a): SomeCompanionInputField => ({
			id: `format_${a.id}`,
			type: 'dropdown',
			// Companion 5.1.0 surface settings ignore isVisibleExpression (renders with isVisible: true),
			// so the label says when the field applies.
			label: `${a.label} format (only with "Set format for each")`,
			default: defaultFormat(a),
			choices: FORMAT_CHOICES,
			isVisibleExpression: `$(options:formatMode) == 'each'`,
		}),
	),
]
