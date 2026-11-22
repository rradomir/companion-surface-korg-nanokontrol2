import {
	type CardGenerator,
	type ModuleLogger,
	type SurfaceContext,
	type SurfaceDrawProps,
	type SurfaceInstance,
	colorToIntensity,
	createModuleLogger,
	parseColor,
} from '@companion-surface/base'
import { ANALOG_BY_CC, BUTTONS, BUTTON_BY_CC, BUTTON_BY_ID, type AnalogDef } from './device.js'
import { MidiConnection, listInputs, listOutputs } from './midi.js'
import { DEFAULT_CONFIG, formatFor, normalizeConfig, type FaderFormat, type SurfaceConfig } from './config.js'

export interface NanoKontrolInfo {
	inputName: string
	outputName: string | undefined
}

/** How often we check that the MIDI ports still exist (unplug detection). */
const PORT_CHECK_MS = 2000

export class NanoKontrolSurface implements SurfaceInstance {
	readonly #logger: ModuleLogger
	readonly #surfaceId: string
	readonly #info: NanoKontrolInfo
	readonly #context: SurfaceContext
	readonly #midi = new MidiConnection((bytes) => this.#handleMidi(bytes))

	#config: SurfaceConfig = DEFAULT_CONFIG
	#portCheck: ReturnType<typeof setInterval> | undefined
	/** Last LED state sent per button id. */
	readonly #leds = new Map<string, boolean>()
	/** Physical pressed state per button id (to drop duplicate messages). */
	readonly #pressed = new Map<string, boolean>()
	/** Last raw value per analog control, re-sent when the format changes. */
	readonly #analogRaw = new Map<string, number>()
	// Throttling state per analog control id.
	readonly #analogTimers = new Map<string, ReturnType<typeof setTimeout>>()
	readonly #pendingAnalog = new Map<string, number>()
	readonly #lastAnalogTime = new Map<string, number>()
	readonly #lastAnalogValue = new Map<string, number>()

	constructor(surfaceId: string, info: NanoKontrolInfo, context: SurfaceContext) {
		this.#logger = createModuleLogger(`Instance/${surfaceId}`)
		this.#surfaceId = surfaceId
		this.#info = info
		this.#context = context
	}

	get surfaceId(): string {
		return this.#surfaceId
	}

	get productName(): string {
		return 'KORG nanoKONTROL2'
	}

	async init(): Promise<void> {
		if (!this.#midi.openInput(this.#info.inputName)) throw new Error(`Cannot open MIDI input "${this.#info.inputName}"`)
		if (this.#info.outputName && !this.#midi.openOutput(this.#info.outputName)) {
			this.#logger.warn(`Cannot open MIDI output "${this.#info.outputName}" - LEDs will not work`)
		}
		this.#allLeds(false, true)
		this.#portCheck = setInterval(() => this.#checkPorts(), PORT_CHECK_MS)
	}

	async close(): Promise<void> {
		if (this.#portCheck) clearInterval(this.#portCheck)
		this.#portCheck = undefined
		for (const t of this.#analogTimers.values()) clearTimeout(t)
		this.#analogTimers.clear()
		this.#allLeds(false, true)
		this.#midi.close()
	}

	async updateConfig(config: Record<string, any>): Promise<void> {
		this.#config = normalizeConfig(config)
		// Re-publish analog values in the (possibly) new format.
		this.#lastAnalogValue.clear()
		for (const [cc, raw] of this.#analogRaw) {
			const def = ANALOG_BY_CC.get(Number(cc))
			if (def) this.#sendAnalog(def, raw)
		}
	}

	async ready(): Promise<void> {}

	async setBrightness(_percent: number): Promise<void> {
		// Single-colour LEDs without dimming.
	}

	async blank(): Promise<void> {
		this.#allLeds(false, true)
	}

	async draw(_signal: AbortSignal, drawProps: SurfaceDrawProps): Promise<void> {
		const button = BUTTON_BY_ID.get(drawProps.controlId)
		if (!button?.hasLed) return
		const on = colorToIntensity(parseColor(drawProps.color)) > this.#config.ledThreshold
		this.#setLed(button.id, button.cc, on)
	}

	async showStatus(_signal: AbortSignal, _cardGenerator: CardGenerator, _statusMessage: string): Promise<void> {
		// No display - just turn the LEDs off.
		this.#allLeds(false, true)
	}

	// ------------------------------------------------------------------ internals

	#handleMidi(bytes: number[]): void {
		if (bytes.length < 3) return
		const [status, cc, value] = bytes
		if ((status & 0xf0) !== 0xb0) return
		if ((status & 0x0f) !== this.#config.channel - 1) return

		const button = BUTTON_BY_CC.get(cc)
		if (button) {
			const down = value > 0
			if (this.#pressed.get(button.id) === down) return
			this.#pressed.set(button.id, down)
			if (down) this.#context.keyDownById(button.id)
			else this.#context.keyUpById(button.id)
			return
		}

		const analog = ANALOG_BY_CC.get(cc)
		if (analog) {
			this.#analogRaw.set(String(cc), value)
			this.#sendAnalog(analog, value)
		}
	}

	/**
	 * Throttled send: at most one value per control every `analogIntervalMs`, the last value always wins
	 * (trailing send), and values identical to the previous one are skipped (e.g. dB rounding).
	 * This keeps fast fader moves from rate-limiting triggers in Companion.
	 */
	#sendAnalog(def: AnalogDef, raw: number): void {
		const value = formatValue(raw, formatFor(this.#config, def), this.#config)
		const interval = this.#config.analogIntervalMs
		if (interval <= 0) return this.#flushAnalog(def.id, value)

		this.#pendingAnalog.set(def.id, value)
		if (this.#analogTimers.has(def.id)) return

		const since = Date.now() - (this.#lastAnalogTime.get(def.id) ?? 0)
		const wait = Math.max(0, interval - since)
		this.#analogTimers.set(
			def.id,
			setTimeout(() => {
				this.#analogTimers.delete(def.id)
				const pending = this.#pendingAnalog.get(def.id)
				this.#pendingAnalog.delete(def.id)
				if (pending !== undefined) this.#flushAnalog(def.id, pending)
			}, wait),
		)
	}

	#flushAnalog(id: string, value: number): void {
		this.#lastAnalogTime.set(id, Date.now())
		if (this.#lastAnalogValue.get(id) === value) return
		this.#lastAnalogValue.set(id, value)
		this.#context.sendVariableValue(id, value)
	}

	#setLed(id: string, cc: number, on: boolean, force = false): void {
		if (!force && this.#leds.get(id) === on) return
		this.#leds.set(id, on)
		this.#midi.send([0xb0 | (this.#config.channel - 1), cc, on ? 127 : 0])
	}

	#allLeds(on: boolean, force: boolean): void {
		for (const b of BUTTONS) if (b.hasLed) this.#setLed(b.id, b.cc, on, force)
	}

	#checkPorts(): void {
		try {
			const inputs = listInputs()
			const outputs = listOutputs()
			const lost =
				!inputs.includes(this.#info.inputName) ||
				(this.#info.outputName !== undefined && !outputs.includes(this.#info.outputName))
			if (lost) {
				if (this.#portCheck) clearInterval(this.#portCheck)
				this.#portCheck = undefined
				this.#midi.close()
				this.#context.disconnect(new Error('nanoKONTROL2 disconnected'))
			}
		} catch (e) {
			this.#logger.warn(`Port check failed: ${String(e)}`)
		}
	}
}

/** Same scaling as the connection module (cubic dB taper, like the OBS slider). */
export function formatValue(raw: number, format: FaderFormat, cfg: SurfaceConfig): number {
	const norm = Math.min(Math.max(raw / 127, 0), 1)
	switch (format) {
		case 'raw':
			return raw
		case 'norm':
			return Math.round(norm * 1000) / 1000
		case 'pct':
			return Math.round(norm * 100)
		case 'pan':
			return Math.round(raw <= 64 ? ((raw - 64) / 64) * 100 : ((raw - 64) / 63) * 100)
		case 'db':
		default: {
			if (norm <= 0) return cfg.dbMin
			const db = Math.max(cfg.dbMin, cfg.dbMax + 60 * Math.log10(norm))
			return Math.round(db * 10) / 10
		}
	}
}
