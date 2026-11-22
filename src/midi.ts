// Thin wrapper over @julusian/midi (RtMidi binding): port listing, open by name, send/receive.
import * as midi from '@julusian/midi'

/** Duplicate names (two identical devices) get a "#2", "#3" suffix so they stay selectable. */
function uniqueNames(raw: readonly string[]): string[] {
	const names: string[] = []
	for (const base of raw) {
		let name = base
		let counter = 1
		while (names.includes(name)) {
			counter++
			name = `${base} #${counter}`
		}
		names.push(name)
	}
	return names
}

function listPorts(port: midi.Input | midi.Output): string[] {
	const raw: string[] = []
	const count = port.getPortCount()
	for (let i = 0; i < count; i++) raw.push(port.getPortName(i))
	return uniqueNames(raw)
}

// Static enumeration: no RtMidi instance is created, so this is cheap enough for the periodic port check.
export function listInputs(): string[] {
	return uniqueNames(midi.Input.getPortNames())
}

export function listOutputs(): string[] {
	return uniqueNames(midi.Output.getPortNames())
}

function release(port: midi.Input | midi.Output): void {
	try {
		port.closePort()
		port.destroy()
	} catch {
		// Port may already be gone (device unplugged).
	}
}

export class MidiConnection {
	private input: midi.Input | undefined
	private output: midi.Output | undefined
	inputName: string | undefined
	outputName: string | undefined

	constructor(private readonly onMessage: (bytes: number[]) => void) {}

	get inputOpen(): boolean {
		return this.input !== undefined
	}

	get outputOpen(): boolean {
		return this.output !== undefined
	}

	openInput(name: string): boolean {
		this.closeInput()
		const input = new midi.Input()
		// Index from this instance's own enumeration, so it matches what openPort() expects.
		const index = listPorts(input).indexOf(name)
		try {
			if (index < 0) throw new Error('not found')
			input.openPort(index)
		} catch {
			release(input)
			return false
		}
		// Ignore sysex, timing and active sensing - we only care about CC.
		input.ignoreTypes(true, true, true)
		input.on('message', (_deltaTime: number, bytes: number[]) => this.onMessage(bytes))
		this.input = input
		this.inputName = name
		return true
	}

	openOutput(name: string): boolean {
		this.closeOutput()
		const output = new midi.Output()
		const index = listPorts(output).indexOf(name)
		try {
			if (index < 0) throw new Error('not found')
			output.openPort(index)
		} catch {
			release(output)
			return false
		}
		this.output = output
		this.outputName = name
		return true
	}

	closeInput(): void {
		if (!this.input) return
		this.input.removeAllListeners('message')
		release(this.input)
		this.input = undefined
		this.inputName = undefined
	}

	closeOutput(): void {
		if (!this.output) return
		release(this.output)
		this.output = undefined
		this.outputName = undefined
	}

	close(): void {
		this.closeInput()
		this.closeOutput()
	}

	send(bytes: number[]): boolean {
		if (!this.output) return false
		try {
			this.output.sendMessage(bytes)
			return true
		} catch {
			return false
		}
	}
}
