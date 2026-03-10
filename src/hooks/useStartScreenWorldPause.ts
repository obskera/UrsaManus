import { useEffect } from "react";
import { dataBus } from "@/services/DataBus";

export function useStartScreenWorldPause(hasStartedExampleGame: boolean) {
    useEffect(() => {
        const startPauseReason = "start-screen";

        if (!hasStartedExampleGame) {
            dataBus.pauseWorld(startPauseReason);
        } else {
            dataBus.resumeWorld(startPauseReason);
        }

        return () => {
            dataBus.resumeWorld(startPauseReason);
        };
    }, [hasStartedExampleGame]);
}
