import type {
	DetectionSurfaceInfo,
	OpenSurfaceResult,
	SurfaceContext,
	SurfacePlugin,
	SurfaceSchemaLayoutDefinition,
} from '@companion-surface/base'
import { ANALOGS, BUTTONS } from './device.js'
import { CONFIG_FIELDS } from './config.js'
import { listInputs, listOutputs } from './midi.js'
import { NanoKontrolSurface, type NanoKontrolInfo } from './instance.js'

const DEVICE_MATCH = /nanokontrol\s*2/i

function createLayout(): SurfaceSchemaLayoutDefinition {
	const layout: SurfaceSchemaLayoutDefinition = {
		stylePresets: {
			// LED buttons only need the background colour.
			default: { colors: 'hex' },
			// Buttons without LED - nothing to draw.
			noLed: {},
		},
		controls: {},
	}
	for (const b of BUTTONS) {
		layout.controls[b.id] = { row: b.row, column: b.column, stylePreset: b.hasLed ? undefined : 'noLed' }
	}
	return layout
}

const NanoKontrolPlugin: SurfacePlugin<NanoKontrolInfo> = {
	init: async (): Promise<void> => {},
	destroy: async (): Promise<void> => {},

	scanForSurfaces: async (): Promise<DetectionSurfaceInfo<NanoKontrolInfo>[]> => {
		const inputs = listInputs().filter((n) => DEVICE_MATCH.test(n))
		const outputs = listOutputs().filter((n) => DEVICE_MATCH.test(n))
		// Pair inputs and outputs by order (ports of one device are listed in the same position).
		return inputs.map((inputName, i) => ({
			surfaceId: i === 0 ? 'nanokontrol2' : `nanokontrol2-${i + 1}`,
			deviceHandle: `midi:${inputName}`,
			description: 'KORG nanoKONTROL2',
			pluginInfo: { inputName, outputName: outputs[i] },
		}))
	},

	openSurface: async (surfaceId: string, pluginInfo: NanoKontrolInfo, context: SurfaceContext): Promise<OpenSurfaceResult> => {
		return {
			surface: new NanoKontrolSurface(surfaceId, pluginInfo, context),
			registerProps: {
				brightness: false,
				surfaceLayout: createLayout(),
				pincodeMap: null,
				location: pluginInfo.inputName,
				configFields: CONFIG_FIELDS,
				transferVariables: ANALOGS.map((a) => ({
					id: a.id,
					type: 'input' as const,
					name: `${a.label} → store value in variable`,
					description: 'Value format is chosen in the surface settings above.',
				})),
			},
		}
	},
}

export default NanoKontrolPlugin
