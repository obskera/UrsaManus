import {
    useEffect,
    useMemo,
    useRef,
    type CSSProperties,
    type ReactNode,
} from "react";
import { type ToastQueueEntry, type ToastVariant } from "./createToastQueue";
import "./Toasts.css";

export type ToastAnchor =
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";

export type ToastDismissReason = "auto-dismiss" | "manual-dismiss";

export type ToastDismissPayload<TMeta = Record<string, unknown>> = {
    id: string;
    reason: ToastDismissReason;
    toast: ToastQueueEntry<TMeta>;
};

export interface ToastsProps<TMeta = Record<string, unknown>> {
    toasts: ToastQueueEntry<TMeta>[];
    anchor?: ToastAnchor;
    maxVisible?: number;
    gapPx?: number;
    dismissible?: boolean;
    className?: string;
    style?: CSSProperties;
    listStyle?: CSSProperties;
    itemStyle?: CSSProperties;
    variantIcons?: Partial<Record<ToastVariant, ReactNode>>;
    variantStyles?: Partial<Record<ToastVariant, CSSProperties>>;
    onDismiss?: (payload: ToastDismissPayload<TMeta>) => void;
}

function normalizeNumber(value: number, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return value;
}

const DEFAULT_ICONS: Record<ToastVariant, string> = {
    info: "i",
    success: "✓",
    warn: "!",
    error: "×",
};

const Toasts = <
    TMeta extends Record<string, unknown> = Record<string, unknown>,
>({
    toasts,
    anchor = "top-right",
    maxVisible = 4,
    gapPx = 8,
    dismissible = true,
    className,
    style,
    listStyle,
    itemStyle,
    variantIcons,
    variantStyles,
    onDismiss,
}: ToastsProps<TMeta>) => {
    const timersRef = useRef<Map<string, number>>(new Map());

    const visibleToasts = useMemo(() => {
        const limit = Math.max(1, Math.floor(normalizeNumber(maxVisible, 4)));
        return toasts.slice(0, limit);
    }, [toasts, maxVisible]);

    useEffect(() => {
        const timers = timersRef.current;
        const activeIds = new Set(visibleToasts.map((toast) => toast.id));

        for (const [id, timer] of timers.entries()) {
            if (!activeIds.has(id)) {
                window.clearTimeout(timer);
                timers.delete(id);
            }
        }

        for (const toast of visibleToasts) {
            if (!Number.isFinite(toast.autoDismissMs)) {
                continue;
            }

            if (timers.has(toast.id)) {
                continue;
            }

            const timeoutMs = Math.max(0, Math.floor(toast.autoDismissMs ?? 0));
            const timer = window.setTimeout(() => {
                timers.delete(toast.id);
                onDismiss?.({
                    id: toast.id,
                    reason: "auto-dismiss",
                    toast,
                });
            }, timeoutMs);

            timers.set(toast.id, timer);
        }

        return () => {
            for (const timer of timers.values()) {
                window.clearTimeout(timer);
            }
            timers.clear();
        };
    }, [visibleToasts, onDismiss]);

    if (visibleToasts.length === 0) {
        return null;
    }

    const rootClassName = className ? `um-toasts ${className}` : "um-toasts";

    return (
        <section
            className={rootClassName}
            aria-label="Toasts"
            data-anchor={anchor}
            style={style}
        >
            <ol
                className="um-toasts__list"
                style={{
                    gap: `${Math.max(0, Math.floor(gapPx))}px`,
                    ...listStyle,
                }}
            >
                {visibleToasts.map((toast) => {
                    const variant = toast.variant ?? "info";

                    return (
                        <li
                            key={toast.id}
                            className="um-toasts__item"
                            role="status"
                            aria-live="polite"
                            data-variant={variant}
                            style={{
                                ...itemStyle,
                                ...(variantStyles?.[variant] ?? {}),
                            }}
                        >
                            <span
                                className="um-toasts__icon"
                                aria-hidden="true"
                            >
                                {variantIcons?.[variant] ??
                                    DEFAULT_ICONS[variant]}
                            </span>
                            <span className="um-toasts__message">
                                {toast.message}
                            </span>
                            {dismissible ? (
                                <button
                                    type="button"
                                    className="um-toasts__dismiss"
                                    aria-label={`Dismiss ${variant} toast`}
                                    onClick={() => {
                                        const activeTimer =
                                            timersRef.current.get(toast.id);
                                        if (activeTimer !== undefined) {
                                            window.clearTimeout(activeTimer);
                                            timersRef.current.delete(toast.id);
                                        }

                                        onDismiss?.({
                                            id: toast.id,
                                            reason: "manual-dismiss",
                                            toast,
                                        });
                                    }}
                                >
                                    Dismiss
                                </button>
                            ) : null}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};

export default Toasts;
