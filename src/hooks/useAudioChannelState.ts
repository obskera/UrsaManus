import { useCallback, useEffect, useState } from "react";
import { audioBus } from "@/services/audioBus";

export function useAudioChannelState() {
    const [isMusicMuted, setIsMusicMuted] = useState(
        () => audioBus.getState().channelMuted.music,
    );
    const [isSfxMuted, setIsSfxMuted] = useState(
        () => audioBus.getState().channelMuted.sfx,
    );

    useEffect(() => {
        const syncAudioState = () => {
            const next = audioBus.getState();
            setIsMusicMuted(next.channelMuted.music);
            setIsSfxMuted(next.channelMuted.sfx);
        };

        const unsubscribe = audioBus.subscribe((event) => {
            if (event.type === "state") {
                syncAudioState();
            }
        });

        syncAudioState();

        return () => {
            unsubscribe();
        };
    }, []);

    const toggleMusicMuted = useCallback(() => {
        const next = !audioBus.getState().channelMuted.music;
        audioBus.setChannelMuted("music", next);
    }, []);

    const toggleSfxMuted = useCallback(() => {
        const next = !audioBus.getState().channelMuted.sfx;
        audioBus.setChannelMuted("sfx", next);
    }, []);

    return {
        isMusicMuted,
        isSfxMuted,
        toggleMusicMuted,
        toggleSfxMuted,
    };
}
