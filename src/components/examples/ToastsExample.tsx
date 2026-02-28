import { useRef, useState } from "react";
import {
    Toasts,
    createToastQueue,
    type ToastAnchor,
    type ToastQueueEntry,
    type ToastVariant,
} from "@/components/toasts";

export type ToastsExampleProps = {
    title?: string;
};

const VARIANTS: ToastVariant[] = ["info", "success", "warn", "error"];

const ToastsExample = ({ title = "Toasts preview" }: ToastsExampleProps) => {
    const queueRef = useRef(createToastQueue());
    const idSequenceRef = useRef(0);
    const [toasts, setToasts] = useState<ToastQueueEntry[]>([]);
    const [anchor, setAnchor] = useState<ToastAnchor>("top-right");

    const queue = queueRef.current;

    const refresh = () => {
        setToasts(queue.list());
    };

    const enqueueToast = (variant: ToastVariant) => {
        idSequenceRef.current += 1;
        queue.enqueue({
            id: `${variant}-${idSequenceRef.current}`,
            variant,
            message: `Queued ${variant} toast for screen-space feedback.`,
            autoDismissMs: 2400,
        });
        refresh();
    };

    const rotateAnchor = () => {
        const next =
            anchor === "top-right"
                ? "bottom-right"
                : anchor === "bottom-right"
                  ? "bottom-left"
                  : anchor === "bottom-left"
                    ? "top-left"
                    : "top-right";
        setAnchor(next);
    };

    const summary = `Anchor: ${anchor}. Pending entries: ${toasts.length}.`;

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Lightweight screen-space toast stack with deterministic
                queueing, timed auto-dismiss, manual dismiss hooks, and variant
                states.
            </p>

            <div className="um-row" role="group" aria-label="Toasts controls">
                {VARIANTS.map((variant) => (
                    <button
                        key={variant}
                        type="button"
                        className="um-button"
                        onClick={() => {
                            enqueueToast(variant);
                        }}
                    >
                        Enqueue {variant}
                    </button>
                ))}

                <button
                    type="button"
                    className="um-button"
                    onClick={rotateAnchor}
                >
                    Rotate anchor ({anchor})
                </button>

                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        queue.clear();
                        refresh();
                    }}
                >
                    Clear toasts
                </button>
            </div>

            <div
                className="um-panel"
                style={{
                    position: "relative",
                    minHeight: "210px",
                    overflow: "hidden",
                }}
            >
                <Toasts
                    toasts={toasts}
                    anchor={anchor}
                    onDismiss={(payload) => {
                        queue.remove(payload.id);
                        refresh();
                    }}
                />
            </div>

            <p className="um-help" aria-label="Toasts queue status">
                {summary}
            </p>
        </section>
    );
};

export default ToastsExample;
