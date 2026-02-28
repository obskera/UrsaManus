export {
    createGrowthTickSimulation,
    resolveGrowthStageDurationMs,
    GROWTH_STAGE_TRANSITION_SIGNAL,
    type CreateGrowthNodeInput,
    type GrowthNode,
    type GrowthNodeProfile,
    type GrowthStage,
    type GrowthStageDurationConfig,
    type GrowthStageTransitionEvent,
} from "./growthTick";

export {
    normalizeEnvironmentalForceZone,
    isPositionInsideEnvironmentalForceZone,
    resolveEnvironmentalForceEffect,
    type EnvironmentalForceVector,
    type EnvironmentalForceZone,
    type EnvironmentalForceZoneBounds,
    type EnvironmentalForceZoneDragScaleByType,
    type EnvironmentalForceZoneInput,
    type ResolvedEnvironmentalForceEffect,
} from "./environmentalForces";

export {
    createStatusEffectsSimulation,
    STATUS_EFFECT_TICK_SIGNAL,
    STATUS_EFFECT_EXPIRED_SIGNAL,
    type StatusEffectExpiredEvent,
    type StatusEffectInput,
    type StatusEffectInstance,
    type StatusEffectStackPolicy,
    type StatusEffectTickEvent,
    type StatusEffectTickPolicy,
    type StatusEffectType,
} from "./statusEffects";

export {
    DEFAULT_INTERACTION_DISTANCE_PX,
    getEntityCenter,
    getEntityDistancePx,
    hasLineOfSightBetweenEntities,
    resolveInteractionHintLabel,
    type InteractionInputHint,
    type InteractionInputMode,
    type InteractionRaycastEntity,
} from "./interaction";
