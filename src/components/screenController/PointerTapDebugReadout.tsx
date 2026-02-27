import type { PointerTapPayload } from "./pointerTapSignal";

export type PointerTapDebugReadoutProps = {
    payload: PointerTapPayload | null;
    className?: string;
};

const PointerTapDebugReadout = ({
    payload,
    className,
}: PointerTapDebugReadoutProps) => {
    return (
        <div className={className} role="status" aria-live="polite">
            {payload ? (
                <>
                    Tap: {Math.round(payload.clientX)},{" "}
                    {Math.round(payload.clientY)} · Local:{" "}
                    {Math.round(payload.localX)}, {Math.round(payload.localY)} ·
                    Inside: {payload.insideTarget ? "yes" : "no"}
                </>
            ) : (
                <>Tap: -- · Local: -- · Inside: --</>
            )}
        </div>
    );
};

export default PointerTapDebugReadout;
