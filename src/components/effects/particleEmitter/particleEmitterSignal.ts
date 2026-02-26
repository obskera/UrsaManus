import { signalBus } from "@/services/SignalBus";
import type { EmitParticlesPayload } from "./types";

export const EMIT_PARTICLES_SIGNAL = "effects:particles:emit";

export function emitParticles(payload: EmitParticlesPayload) {
    signalBus.emit(EMIT_PARTICLES_SIGNAL, payload);
}
