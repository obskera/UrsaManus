import { signalBus } from "@/services/signalBus";
import {
    localizationService,
    resolveLocalizedPromptMessage,
} from "@/services/localization";

export type TutorialStatus = "idle" | "active" | "completed" | "skipped";

export type TutorialPromptChannel = "dialogue" | "textbox" | "toast" | "custom";

export type TutorialPrompt = {
    channel: TutorialPromptChannel;
    message: string;
    payload?: Record<string, unknown>;
};

export type TutorialPromptLocalizationResolver = (input: {
    channel: TutorialPromptChannel;
    message: string;
    payload?: Record<string, unknown>;
}) => string;

export type TutorialStepDefinition = {
    id: string;
    label: string;
    prompt?: TutorialPrompt;
    gate?: (input: {
        flowId: string;
        stepId: string;
        context: Record<string, unknown>;
        snapshot: TutorialSnapshot;
    }) => boolean;
};

export type TutorialFlowDefinition = {
    id: string;
    steps: TutorialStepDefinition[];
};

export type TutorialPersistedState = {
    flowId: string | null;
    status: TutorialStatus;
    currentStepId: string | null;
    completedStepIds: string[];
    skipped: boolean;
};

export type TutorialSnapshot = {
    flowId: string | null;
    status: TutorialStatus;
    currentStepId: string | null;
    completedStepIds: string[];
    skipped: boolean;
    totalSteps: number;
};

export type TutorialOnboardingService = {
    registerFlow: (flow: TutorialFlowDefinition) => boolean;
    unregisterFlow: (flowId: string) => boolean;
    setContext: (patch: Record<string, unknown>) => TutorialSnapshot;
    resetContext: () => TutorialSnapshot;
    start: (flowId: string, options?: { resume?: boolean }) => boolean;
    canAdvance: () => {
        ok: boolean;
        reason: "no-flow" | "no-step" | "gate-blocked" | null;
    };
    advance: () => boolean;
    skip: () => boolean;
    resume: () => boolean;
    getSnapshot: () => TutorialSnapshot;
    getPersistedState: () => TutorialPersistedState;
    restorePersistedState: (state: unknown) => boolean;
};

export const TUTORIAL_STARTED_SIGNAL = "tutorial:onboarding:started";
export const TUTORIAL_STEP_CHANGED_SIGNAL = "tutorial:onboarding:step:changed";
export const TUTORIAL_STEP_BLOCKED_SIGNAL = "tutorial:onboarding:step:blocked";
export const TUTORIAL_STEP_COMPLETED_SIGNAL =
    "tutorial:onboarding:step:completed";
export const TUTORIAL_COMPLETED_SIGNAL = "tutorial:onboarding:completed";
export const TUTORIAL_SKIPPED_SIGNAL = "tutorial:onboarding:skipped";
export const TUTORIAL_RESUMED_SIGNAL = "tutorial:onboarding:resumed";
export const TUTORIAL_PROMPT_SIGNAL = "tutorial:onboarding:prompt";

function clonePrompt(prompt: TutorialPrompt): TutorialPrompt {
    return {
        channel: prompt.channel,
        message: prompt.message,
        ...(prompt.payload ? { payload: { ...prompt.payload } } : {}),
    };
}

function normalizeFlow(
    input: TutorialFlowDefinition,
): TutorialFlowDefinition | null {
    const id = input.id.trim();
    if (!id || input.steps.length === 0) {
        return null;
    }

    const seen = new Set<string>();
    const normalizedSteps: TutorialStepDefinition[] = [];

    for (const step of input.steps) {
        const stepId = step.id.trim();
        const label = step.label.trim();

        if (!stepId || !label || seen.has(stepId)) {
            return null;
        }

        seen.add(stepId);
        normalizedSteps.push({
            id: stepId,
            label,
            ...(step.prompt
                ? {
                      prompt: {
                          channel: step.prompt.channel,
                          message: step.prompt.message.trim(),
                          ...(step.prompt.payload
                              ? { payload: { ...step.prompt.payload } }
                              : {}),
                      },
                  }
                : {}),
            ...(step.gate ? { gate: step.gate } : {}),
        });
    }

    return {
        id,
        steps: normalizedSteps,
    };
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function createTutorialOnboardingService(options?: {
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
    localizePrompt?: TutorialPromptLocalizationResolver;
}): TutorialOnboardingService {
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });
    const localizePrompt =
        options?.localizePrompt ??
        ((input: {
            channel: TutorialPromptChannel;
            message: string;
            payload?: Record<string, unknown>;
        }) =>
            resolveLocalizedPromptMessage(localizationService, {
                channel: input.channel,
                message: input.message,
                ...(input.payload ? { payload: input.payload } : {}),
            }));

    const flowsById = new Map<string, TutorialFlowDefinition>();
    const context: Record<string, unknown> = {};

    let flowId: string | null = null;
    let status: TutorialStatus = "idle";
    let currentStepIndex = -1;
    let skipped = false;
    const completedStepIds = new Set<string>();

    const getActiveFlow = () => {
        if (!flowId) {
            return null;
        }

        return flowsById.get(flowId) ?? null;
    };

    const getCurrentStep = () => {
        const flow = getActiveFlow();
        if (!flow) {
            return null;
        }

        if (currentStepIndex < 0 || currentStepIndex >= flow.steps.length) {
            return null;
        }

        return flow.steps[currentStepIndex];
    };

    const emitPromptIfPresent = (step: TutorialStepDefinition | null) => {
        if (!step?.prompt) {
            return;
        }

        const localizedMessage = localizePrompt({
            channel: step.prompt.channel,
            message: step.prompt.message,
            ...(step.prompt.payload ? { payload: step.prompt.payload } : {}),
        });

        emit(TUTORIAL_PROMPT_SIGNAL, {
            flowId,
            stepId: step.id,
            prompt: {
                ...clonePrompt(step.prompt),
                message: localizedMessage,
            },
        });
    };

    const getSnapshot = (): TutorialSnapshot => {
        const flow = getActiveFlow();
        return {
            flowId,
            status,
            currentStepId: getCurrentStep()?.id ?? null,
            completedStepIds: Array.from(completedStepIds).sort((a, b) =>
                a.localeCompare(b),
            ),
            skipped,
            totalSteps: flow?.steps.length ?? 0,
        };
    };

    const getPersistedState = (): TutorialPersistedState => {
        const snapshot = getSnapshot();
        return {
            flowId: snapshot.flowId,
            status: snapshot.status,
            currentStepId: snapshot.currentStepId,
            completedStepIds: [...snapshot.completedStepIds],
            skipped: snapshot.skipped,
        };
    };

    const clearRuntime = () => {
        flowId = null;
        status = "idle";
        currentStepIndex = -1;
        skipped = false;
        completedStepIds.clear();
    };

    const setContext = (patch: Record<string, unknown>) => {
        Object.assign(context, patch);
        return getSnapshot();
    };

    const resetContext = () => {
        for (const key of Object.keys(context)) {
            delete context[key];
        }

        return getSnapshot();
    };

    const registerFlow: TutorialOnboardingService["registerFlow"] = (flow) => {
        const normalized = normalizeFlow(flow);
        if (!normalized) {
            return false;
        }

        flowsById.set(normalized.id, normalized);
        return true;
    };

    const unregisterFlow = (inputFlowId: string): boolean => {
        const id = inputFlowId.trim();
        if (!id) {
            return false;
        }

        const didDelete = flowsById.delete(id);
        if (didDelete && flowId === id) {
            clearRuntime();
        }

        return didDelete;
    };

    const start = (inputFlowId: string, options?: { resume?: boolean }) => {
        const id = inputFlowId.trim();
        const flow = flowsById.get(id);
        if (!flow) {
            return false;
        }

        const isResume = options?.resume === true;
        if (!isResume) {
            completedStepIds.clear();
            skipped = false;
            currentStepIndex = 0;
        } else {
            skipped = false;
            const stepIds = flow.steps.map((step) => step.id);
            const firstIncomplete = stepIds.findIndex(
                (stepId) => !completedStepIds.has(stepId),
            );
            currentStepIndex = firstIncomplete >= 0 ? firstIncomplete : 0;
        }

        flowId = id;
        status = "active";

        emit(TUTORIAL_STARTED_SIGNAL, {
            flowId: id,
            resume: isResume,
            stepId: getCurrentStep()?.id ?? null,
        });

        emit(TUTORIAL_STEP_CHANGED_SIGNAL, {
            flowId: id,
            stepId: getCurrentStep()?.id ?? null,
            index: currentStepIndex,
        });

        emitPromptIfPresent(getCurrentStep());

        return true;
    };

    const canAdvance: TutorialOnboardingService["canAdvance"] = () => {
        const flow = getActiveFlow();
        const step = getCurrentStep();

        if (!flow) {
            return { ok: false, reason: "no-flow" as const };
        }

        if (!step || status !== "active") {
            return { ok: false, reason: "no-step" as const };
        }

        if (step.gate) {
            const allowed = step.gate({
                flowId: flow.id,
                stepId: step.id,
                context: { ...context },
                snapshot: getSnapshot(),
            });

            if (!allowed) {
                return { ok: false, reason: "gate-blocked" as const };
            }
        }

        return { ok: true, reason: null };
    };

    const advance = () => {
        const flow = getActiveFlow();
        const step = getCurrentStep();

        if (!flow || !step || status !== "active") {
            return false;
        }

        const gate = canAdvance();
        if (!gate.ok) {
            emit(TUTORIAL_STEP_BLOCKED_SIGNAL, {
                flowId: flow.id,
                stepId: step.id,
                reason: gate.reason,
            });
            return false;
        }

        completedStepIds.add(step.id);
        emit(TUTORIAL_STEP_COMPLETED_SIGNAL, {
            flowId: flow.id,
            stepId: step.id,
        });

        const nextIndex = currentStepIndex + 1;
        if (nextIndex >= flow.steps.length) {
            status = "completed";
            currentStepIndex = flow.steps.length - 1;
            emit(TUTORIAL_COMPLETED_SIGNAL, {
                flowId: flow.id,
                completedStepIds: Array.from(completedStepIds),
            });
            return true;
        }

        currentStepIndex = nextIndex;
        emit(TUTORIAL_STEP_CHANGED_SIGNAL, {
            flowId: flow.id,
            stepId: flow.steps[currentStepIndex].id,
            index: currentStepIndex,
        });
        emitPromptIfPresent(flow.steps[currentStepIndex]);

        return true;
    };

    const skip = () => {
        const flow = getActiveFlow();
        if (!flow || status !== "active") {
            return false;
        }

        status = "skipped";
        skipped = true;

        emit(TUTORIAL_SKIPPED_SIGNAL, {
            flowId: flow.id,
            stepId: getCurrentStep()?.id ?? null,
        });

        return true;
    };

    const resume = () => {
        const flow = getActiveFlow();
        if (!flow || status === "completed") {
            return false;
        }

        const stepIds = flow.steps.map((step) => step.id);
        const firstIncomplete = stepIds.findIndex(
            (stepId) => !completedStepIds.has(stepId),
        );

        if (firstIncomplete < 0) {
            status = "completed";
            skipped = false;
            emit(TUTORIAL_COMPLETED_SIGNAL, {
                flowId: flow.id,
                completedStepIds: Array.from(completedStepIds),
            });
            return true;
        }

        status = "active";
        skipped = false;
        currentStepIndex = firstIncomplete;

        emit(TUTORIAL_RESUMED_SIGNAL, {
            flowId: flow.id,
            stepId: getCurrentStep()?.id ?? null,
        });
        emit(TUTORIAL_STEP_CHANGED_SIGNAL, {
            flowId: flow.id,
            stepId: getCurrentStep()?.id ?? null,
            index: currentStepIndex,
        });
        emitPromptIfPresent(getCurrentStep());

        return true;
    };

    const restorePersistedState = (value: unknown) => {
        if (!isObject(value)) {
            return false;
        }

        const persistedFlowId =
            typeof value.flowId === "string" ? value.flowId.trim() : "";
        const flow = persistedFlowId ? flowsById.get(persistedFlowId) : null;

        if (!flow) {
            return false;
        }

        const persistedStatus = value.status;
        if (
            persistedStatus !== "idle" &&
            persistedStatus !== "active" &&
            persistedStatus !== "completed" &&
            persistedStatus !== "skipped"
        ) {
            return false;
        }

        const persistedCompleted = Array.isArray(value.completedStepIds)
            ? value.completedStepIds
                  .filter((entry): entry is string => typeof entry === "string")
                  .map((entry) => entry.trim())
                  .filter((entry) =>
                      flow.steps.some((step) => step.id === entry),
                  )
            : [];

        const persistedCurrentStepId =
            typeof value.currentStepId === "string"
                ? value.currentStepId.trim()
                : "";

        flowId = flow.id;
        status = persistedStatus;
        skipped = value.skipped === true || persistedStatus === "skipped";
        completedStepIds.clear();
        for (const stepId of persistedCompleted) {
            completedStepIds.add(stepId);
        }

        const indexFromStep = flow.steps.findIndex(
            (step) => step.id === persistedCurrentStepId,
        );

        if (indexFromStep >= 0) {
            currentStepIndex = indexFromStep;
        } else {
            const firstIncomplete = flow.steps.findIndex(
                (step) => !completedStepIds.has(step.id),
            );
            currentStepIndex = firstIncomplete >= 0 ? firstIncomplete : 0;
        }

        if (status === "completed") {
            for (const step of flow.steps) {
                completedStepIds.add(step.id);
            }
            currentStepIndex = flow.steps.length - 1;
        }

        return true;
    };

    return {
        registerFlow,
        unregisterFlow,
        setContext,
        resetContext,
        start,
        canAdvance,
        advance,
        skip,
        resume,
        getSnapshot,
        getPersistedState,
        restorePersistedState,
    };
}

export const tutorialOnboarding = createTutorialOnboardingService();
