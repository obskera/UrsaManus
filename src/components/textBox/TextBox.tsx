import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
import "./TextBox.css";

export type TextBoxRevealMode = "static" | "typewriter";

export type TextBoxAlign = "left" | "center" | "right";

export type TextBoxLifecycleReason =
    | "opened"
    | "updated"
    | "closed"
    | "auto-close";

export type TextBoxRenderState = {
    isOpen: boolean;
    revealMode: TextBoxRevealMode;
    fullText: string;
    visibleText: string;
    revealedCharacters: number;
    totalCharacters: number;
    progress: number;
    elapsedMs: number;
    maxLines: number;
    x: number;
    y: number;
    width: number;
    autoCloseMs: number | null;
};

export type TextBoxLifecyclePayload = {
    reason: TextBoxLifecycleReason;
    state: TextBoxRenderState;
};

export interface TextBoxProps {
    text: string;
    x: number;
    y: number;
    width: number;
    maxLines?: number;
    open?: boolean;
    revealMode?: TextBoxRevealMode;
    typewriterCharsPerSecond?: number;
    elapsedMs?: number;
    autoCloseMs?: number;
    align?: TextBoxAlign;
    portrait?: ReactNode;
    icon?: ReactNode;
    className?: string;
    style?: CSSProperties;
    panelStyle?: CSSProperties;
    textStyle?: CSSProperties;
    onOpen?: (payload: TextBoxLifecyclePayload) => void;
    onUpdate?: (payload: TextBoxLifecyclePayload) => void;
    onClose?: (payload: TextBoxLifecyclePayload) => void;
}

function normalizeNumber(value: number, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return value;
}

function clampLines(text: string, maxLines: number): string {
    const normalizedMaxLines = Math.max(1, Math.floor(maxLines));
    const lines = text.split("\n");
    return lines.slice(0, normalizedMaxLines).join("\n");
}

function buildVisibleText(
    text: string,
    revealMode: TextBoxRevealMode,
    revealedCharacters: number,
): string {
    if (revealMode === "static") {
        return text;
    }

    return text.slice(0, Math.max(0, Math.floor(revealedCharacters)));
}

function buildRenderState(params: {
    isOpen: boolean;
    revealMode: TextBoxRevealMode;
    fullText: string;
    visibleText: string;
    revealedCharacters: number;
    elapsedMs: number;
    maxLines: number;
    x: number;
    y: number;
    width: number;
    autoCloseMs: number | null;
}): TextBoxRenderState {
    const totalCharacters = params.fullText.length;
    const progress =
        totalCharacters > 0
            ? Math.min(1, params.revealedCharacters / totalCharacters)
            : 1;

    return {
        isOpen: params.isOpen,
        revealMode: params.revealMode,
        fullText: params.fullText,
        visibleText: params.visibleText,
        revealedCharacters: Math.max(0, Math.floor(params.revealedCharacters)),
        totalCharacters,
        progress,
        elapsedMs: Math.max(0, Math.floor(params.elapsedMs)),
        maxLines: Math.max(1, Math.floor(params.maxLines)),
        x: params.x,
        y: params.y,
        width: params.width,
        autoCloseMs: params.autoCloseMs,
    };
}

const TextBoxInner = ({
    text,
    x,
    y,
    width,
    maxLines = 4,
    open = true,
    revealMode = "static",
    typewriterCharsPerSecond = 40,
    elapsedMs,
    autoCloseMs,
    align = "left",
    portrait,
    icon,
    className,
    style,
    panelStyle,
    textStyle,
    onOpen,
    onUpdate,
    onClose,
}: TextBoxProps) => {
    const [internalElapsedMs, setInternalElapsedMs] = useState(0);
    const [autoClosed, setAutoClosed] = useState(false);
    const previousOpenRef = useRef<boolean>(open);

    const normalizedText = useMemo(
        () => clampLines(text ?? "", maxLines),
        [text, maxLines],
    );
    const normalizedWidth = Math.max(1, normalizeNumber(width, 1));
    const normalizedX = normalizeNumber(x, 0);
    const normalizedY = normalizeNumber(y, 0);
    const normalizedAutoCloseMs = Number.isFinite(autoCloseMs)
        ? Math.max(0, Math.floor(autoCloseMs ?? 0))
        : null;

    useEffect(() => {
        if (!open || autoClosed || elapsedMs !== undefined) {
            return;
        }

        const timer = window.setInterval(() => {
            setInternalElapsedMs((current) => current + 33);
        }, 33);

        return () => {
            window.clearInterval(timer);
        };
    }, [open, autoClosed, elapsedMs]);

    const effectiveElapsedMs =
        elapsedMs !== undefined
            ? Math.max(0, Math.floor(normalizeNumber(elapsedMs, 0)))
            : internalElapsedMs;

    const revealRate = Math.max(
        0,
        normalizeNumber(typewriterCharsPerSecond, 0),
    );
    const revealedCharacters =
        revealMode === "typewriter"
            ? Math.min(
                  normalizedText.length,
                  Math.floor((effectiveElapsedMs / 1000) * revealRate),
              )
            : normalizedText.length;

    const visibleText = buildVisibleText(
        normalizedText,
        revealMode,
        revealedCharacters,
    );

    const isVisible = open && !autoClosed;

    const renderState = buildRenderState({
        isOpen: isVisible,
        revealMode,
        fullText: normalizedText,
        visibleText,
        revealedCharacters,
        elapsedMs: effectiveElapsedMs,
        maxLines,
        x: normalizedX,
        y: normalizedY,
        width: normalizedWidth,
        autoCloseMs: normalizedAutoCloseMs,
    });

    useEffect(() => {
        const previousOpen = previousOpenRef.current;
        previousOpenRef.current = open;

        if (open && !previousOpen) {
            onOpen?.({ reason: "opened", state: renderState });
            return;
        }

        if (!open && previousOpen) {
            onClose?.({ reason: "closed", state: renderState });
            return;
        }

        if (open) {
            onUpdate?.({ reason: "updated", state: renderState });
        }
    }, [open, renderState, onOpen, onUpdate, onClose]);

    useEffect(() => {
        if (!isVisible || normalizedAutoCloseMs === null) {
            return;
        }

        const remainingMs = Math.max(
            0,
            normalizedAutoCloseMs - effectiveElapsedMs,
        );

        const timer = window.setTimeout(() => {
            setAutoClosed(true);
            onClose?.({
                reason: "auto-close",
                state: {
                    ...renderState,
                    isOpen: false,
                },
            });
        }, remainingMs);

        return () => {
            window.clearTimeout(timer);
        };
    }, [
        isVisible,
        normalizedAutoCloseMs,
        effectiveElapsedMs,
        onClose,
        renderState,
    ]);

    if (!isVisible) {
        return null;
    }

    const rootClassName = className
        ? `um-text-box ${className}`
        : "um-text-box";

    return (
        <div
            className={rootClassName}
            role="status"
            aria-live="polite"
            data-open={isVisible ? "true" : "false"}
            data-reveal-mode={revealMode}
            style={{
                left: `${normalizedX}px`,
                top: `${normalizedY}px`,
                width: `${normalizedWidth}px`,
                ...style,
            }}
        >
            <div className="um-text-box__panel" style={panelStyle}>
                {portrait ? (
                    <div className="um-text-box__portrait">{portrait}</div>
                ) : null}

                <div className="um-text-box__content" data-align={align}>
                    {icon ? (
                        <div className="um-text-box__icon">{icon}</div>
                    ) : null}
                    <p className="um-text-box__text" style={textStyle}>
                        {visibleText}
                    </p>
                </div>
            </div>
        </div>
    );
};

const TextBox = (props: TextBoxProps) => {
    const resetKey = `${props.text ?? ""}::${props.revealMode ?? "static"}`;

    return <TextBoxInner key={resetKey} {...props} />;
};

export default TextBox;
