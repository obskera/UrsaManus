import { useState } from "react";
import {
    TextBox,
    createTextBoxQueue,
    type TextBoxQueuePolicy,
} from "@/components/textBox";

export type TextBoxExampleProps = {
    title?: string;
};

type QueueItemMeta = {
    mood: string;
};

const queueController = createTextBoxQueue<QueueItemMeta>("queue");
const stackController = createTextBoxQueue<QueueItemMeta>("stack");

const TextBoxExample = ({ title = "TextBox preview" }: TextBoxExampleProps) => {
    const [revealMode, setRevealMode] = useState<"static" | "typewriter">(
        "typewriter",
    );
    const [isOpen, setIsOpen] = useState(true);
    const [policy, setPolicy] = useState<TextBoxQueuePolicy>("queue");
    const [, setQueueRevision] = useState(0);
    const activeQueue = policy === "queue" ? queueController : stackController;

    const activeEntry = activeQueue.getActive();
    const text = activeEntry?.text ?? "Welcome to UrsaManus.";

    const refreshActive = () => {
        setQueueRevision((current) => current + 1);
    };

    const enqueueDemoLine = () => {
        const id = `${policy}-${Date.now()}`;
        const mood = policy === "queue" ? "calm" : "urgent";

        activeQueue.enqueue({
            id,
            text:
                policy === "queue"
                    ? "Queue policy: first-in line progresses deterministically."
                    : "Stack policy: latest message is shown first (LIFO).",
            autoCloseMs: 2200,
            meta: { mood },
        });
        refreshActive();
        setIsOpen(true);
    };

    const nextLine = () => {
        activeQueue.dequeue();
        refreshActive();
        setIsOpen(true);
    };

    const clearLines = () => {
        activeQueue.clear();
        refreshActive();
    };

    return (
        <section className="um-container um-stack" aria-label={title}>
            <h3 className="um-title">{title}</h3>
            <p className="um-help">
                Spawnable text box prefab with static/typewriter reveal,
                lifecycle-driven auto-close, and deterministic queue/stack
                sequencing.
            </p>

            <div className="um-row" role="group" aria-label="TextBox controls">
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setRevealMode((current) =>
                            current === "typewriter" ? "static" : "typewriter",
                        );
                    }}
                >
                    Toggle reveal mode ({revealMode})
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setIsOpen((current) => !current);
                    }}
                >
                    {isOpen ? "Hide" : "Show"} text box
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={() => {
                        setPolicy((current) =>
                            current === "queue" ? "stack" : "queue",
                        );
                        setQueueRevision(0);
                    }}
                >
                    Toggle policy ({policy})
                </button>
                <button
                    type="button"
                    className="um-button um-button--primary"
                    onClick={enqueueDemoLine}
                >
                    Enqueue line
                </button>
                <button type="button" className="um-button" onClick={nextLine}>
                    Next line
                </button>
                <button
                    type="button"
                    className="um-button"
                    onClick={clearLines}
                >
                    Clear lines
                </button>
            </div>

            <div
                className="um-panel"
                style={{
                    position: "relative",
                    minHeight: "180px",
                }}
            >
                <TextBox
                    text={text}
                    open={isOpen}
                    x={12}
                    y={12}
                    width={420}
                    maxLines={4}
                    revealMode={revealMode}
                    typewriterCharsPerSecond={46}
                    autoCloseMs={activeEntry?.autoCloseMs}
                    align="left"
                    portrait={<span aria-hidden="true">🧭</span>}
                    icon={<span aria-hidden="true">i</span>}
                    onClose={(payload) => {
                        if (payload.reason === "auto-close") {
                            activeQueue.dequeue();
                            refreshActive();
                        }
                    }}
                />
            </div>

            <p className="um-help" aria-label="TextBox queue status">
                Active policy: {policy}. Pending entries: {activeQueue.size()}.
            </p>
        </section>
    );
};

export default TextBoxExample;
