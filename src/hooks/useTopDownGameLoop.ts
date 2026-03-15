import { useEffect, useRef } from "react";
import { dataBus } from "@/services/DataBus";

export function useTopDownGameLoop(
    shouldRunGameLoop: boolean,
    onTickStateChanged: () => void,
) {
    const lastPlayerStateRef = useRef<string>("");
    const lastPlayerFacingRef = useRef<string>("south");

    useEffect(() => {
        if (!shouldRunGameLoop) {
            return;
        }

        const initialState = dataBus.getState();
        lastPlayerStateRef.current = dataBus.getEntityBehaviorState(
            initialState.playerId,
        );
        lastPlayerFacingRef.current = dataBus.getPlayerFacingDirection();

        let rafId = 0;
        let lastFrame = performance.now();

        const tick = (now: number) => {
            const deltaMs = now - lastFrame;
            lastFrame = now;

            const didStepPhysics = dataBus.stepPhysics(deltaMs);
            const gameState = dataBus.getState();
            const nextPlayerState = dataBus.getEntityBehaviorState(
                gameState.playerId,
            );
            const nextPlayerFacing = dataBus.getPlayerFacingDirection();
            const hasActiveSpecialCooldown =
                dataBus.getPlayerSpecialCooldownRemainingMs() > 0;
            const didStateChange =
                nextPlayerState !== lastPlayerStateRef.current ||
                nextPlayerFacing !== lastPlayerFacingRef.current;

            if (didStateChange) {
                lastPlayerStateRef.current = nextPlayerState;
                lastPlayerFacingRef.current = nextPlayerFacing;
            }

            if (didStepPhysics || didStateChange || hasActiveSpecialCooldown) {
                onTickStateChanged();
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);

        return () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [onTickStateChanged, shouldRunGameLoop]);
}
