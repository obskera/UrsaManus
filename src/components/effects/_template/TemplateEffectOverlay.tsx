import "./templateEffect.css";
import { useTemplateEffect } from "./useTemplateEffect";

type TemplateEffectOverlayProps = {
    width: number;
    height: number;
};

const TemplateEffectOverlay = ({
    width,
    height,
}: TemplateEffectOverlayProps) => {
    const { active } = useTemplateEffect();

    if (!active) return null;

    return (
        <div
            className="template-effect-overlay"
            style={{ width, height }}
            aria-hidden
        />
    );
};

export default TemplateEffectOverlay;
