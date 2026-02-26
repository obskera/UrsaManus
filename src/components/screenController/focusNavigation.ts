export type FocusNavigationOrientation = "horizontal" | "vertical" | "both";

export type HandleArrowFocusNavigationOptions = {
    orientation?: FocusNavigationOrientation;
    wrap?: boolean;
    preventDefault?: boolean;
    includeFromTypingTargets?: boolean;
    focusableSelector?: string;
};

const DEFAULT_FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return true;
    }

    return target.isContentEditable;
}

function toDirection(
    key: string,
    orientation: FocusNavigationOrientation,
): -1 | 1 | null {
    if (orientation === "horizontal") {
        if (key === "ArrowLeft") return -1;
        if (key === "ArrowRight") return 1;
        return null;
    }

    if (orientation === "vertical") {
        if (key === "ArrowUp") return -1;
        if (key === "ArrowDown") return 1;
        return null;
    }

    if (key === "ArrowLeft" || key === "ArrowUp") return -1;
    if (key === "ArrowRight" || key === "ArrowDown") return 1;
    return null;
}

export function getFocusableElements(
    root: ParentNode,
    selector = DEFAULT_FOCUSABLE_SELECTOR,
): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
        (element) => !element.hasAttribute("disabled"),
    );
}

export function handleArrowFocusNavigation(
    event: KeyboardEvent,
    root: ParentNode,
    {
        orientation = "both",
        wrap = true,
        preventDefault = true,
        includeFromTypingTargets = false,
        focusableSelector = DEFAULT_FOCUSABLE_SELECTOR,
    }: HandleArrowFocusNavigationOptions = {},
): boolean {
    if (!includeFromTypingTargets && isTypingTarget(event.target)) {
        return false;
    }

    const direction = toDirection(event.key, orientation);
    if (!direction) {
        return false;
    }

    const elements = getFocusableElements(root, focusableSelector);
    if (elements.length === 0) {
        return false;
    }

    const active =
        event.target instanceof HTMLElement
            ? event.target
            : document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;

    const currentIndex = active ? elements.indexOf(active) : -1;
    let nextIndex = currentIndex + direction;

    if (currentIndex === -1) {
        nextIndex = direction > 0 ? 0 : elements.length - 1;
    }

    if (wrap) {
        if (nextIndex < 0) {
            nextIndex = elements.length - 1;
        } else if (nextIndex >= elements.length) {
            nextIndex = 0;
        }
    } else if (nextIndex < 0 || nextIndex >= elements.length) {
        return false;
    }

    const next = elements[nextIndex];
    if (!next) {
        return false;
    }

    next.focus();

    if (preventDefault) {
        event.preventDefault();
    }

    return true;
}
