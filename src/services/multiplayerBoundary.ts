import { signalBus } from "@/services/signalBus";

export type MultiplayerAuthority = "server" | "client" | "shared";

export type MultiplayerContract = {
    id: string;
    label: string;
    deterministic: boolean;
    authority: MultiplayerAuthority;
    replicationSafeApis: string[];
};

export type MultiplayerActionActor = "server" | "client";

export type MultiplayerBoundaryAction = {
    contractId: string;
    api: string;
    actor: MultiplayerActionActor;
};

export type MultiplayerBoundaryBlockedReason =
    | "missing-contract"
    | "missing-api"
    | "actor-authority-mismatch"
    | "api-not-replication-safe";

export type MultiplayerBoundaryEvaluation = {
    ok: boolean;
    contractId: string;
    api: string;
    actor: MultiplayerActionActor;
    deterministic: boolean;
    authority: MultiplayerAuthority | null;
    replicationSafe: boolean;
    reason: MultiplayerBoundaryBlockedReason | null;
};

export type MultiplayerReadinessReport = {
    totalContracts: number;
    deterministicContracts: number;
    serverAuthorityContracts: number;
    sharedAuthorityContracts: number;
    clientAuthorityContracts: number;
    replicationSafeApiCount: number;
    nonDeterministicContracts: string[];
};

export type MultiplayerBoundaryService = {
    registerContract: (contract: MultiplayerContract) => boolean;
    unregisterContract: (contractId: string) => boolean;
    getContract: (contractId: string) => MultiplayerContract | null;
    listContracts: () => MultiplayerContract[];
    isApiReplicationSafe: (contractId: string, api: string) => boolean;
    evaluateAction: (
        action: MultiplayerBoundaryAction,
    ) => MultiplayerBoundaryEvaluation;
    getReadinessReport: () => MultiplayerReadinessReport;
};

export const MULTIPLAYER_BOUNDARY_UPDATED_SIGNAL =
    "multiplayer:boundary:updated";
export const MULTIPLAYER_BOUNDARY_EVALUATED_SIGNAL =
    "multiplayer:boundary:evaluated";

function cloneContract(contract: MultiplayerContract): MultiplayerContract {
    return {
        ...contract,
        replicationSafeApis: [...contract.replicationSafeApis],
    };
}

function normalizeContract(
    input: MultiplayerContract,
): MultiplayerContract | null {
    const id = input.id.trim();
    const label = input.label.trim();

    if (!id || !label) {
        return null;
    }

    const apiSet = new Set(
        input.replicationSafeApis
            .map((api) => api.trim())
            .filter((api) => api.length > 0),
    );

    return {
        id,
        label,
        deterministic: input.deterministic,
        authority: input.authority,
        replicationSafeApis: Array.from(apiSet).sort((a, b) =>
            a.localeCompare(b),
        ),
    };
}

export function createMultiplayerBoundaryService(options?: {
    emit?: <TPayload>(signal: string, payload: TPayload) => void;
}): MultiplayerBoundaryService {
    const emit =
        options?.emit ??
        (<TPayload>(signal: string, payload: TPayload) => {
            signalBus.emit(signal, payload);
        });

    const contractsById = new Map<string, MultiplayerContract>();

    const emitUpdated = () => {
        emit(MULTIPLAYER_BOUNDARY_UPDATED_SIGNAL, {
            totalContracts: contractsById.size,
        });
    };

    const registerContract: MultiplayerBoundaryService["registerContract"] = (
        contract,
    ) => {
        const normalized = normalizeContract(contract);
        if (!normalized) {
            return false;
        }

        contractsById.set(normalized.id, normalized);
        emitUpdated();
        return true;
    };

    const unregisterContract = (contractId: string): boolean => {
        const id = contractId.trim();
        if (!id) {
            return false;
        }

        const deleted = contractsById.delete(id);
        if (deleted) {
            emitUpdated();
        }

        return deleted;
    };

    const getContract = (contractId: string): MultiplayerContract | null => {
        const contract = contractsById.get(contractId.trim());
        return contract ? cloneContract(contract) : null;
    };

    const listContracts = (): MultiplayerContract[] => {
        return Array.from(contractsById.values())
            .sort((left, right) => left.id.localeCompare(right.id))
            .map((contract) => cloneContract(contract));
    };

    const isApiReplicationSafe = (contractId: string, api: string): boolean => {
        const contract = contractsById.get(contractId.trim());
        if (!contract) {
            return false;
        }

        const normalizedApi = api.trim();
        if (!normalizedApi) {
            return false;
        }

        return contract.replicationSafeApis.includes(normalizedApi);
    };

    const evaluateAction: MultiplayerBoundaryService["evaluateAction"] = (
        action,
    ) => {
        const contract = contractsById.get(action.contractId.trim());
        const normalizedApi = action.api.trim();

        if (!contract) {
            const missing: MultiplayerBoundaryEvaluation = {
                ok: false,
                contractId: action.contractId.trim(),
                api: normalizedApi,
                actor: action.actor,
                deterministic: false,
                authority: null,
                replicationSafe: false,
                reason: "missing-contract",
            };
            emit(MULTIPLAYER_BOUNDARY_EVALUATED_SIGNAL, missing);
            return missing;
        }

        if (!normalizedApi) {
            const missingApi: MultiplayerBoundaryEvaluation = {
                ok: false,
                contractId: contract.id,
                api: normalizedApi,
                actor: action.actor,
                deterministic: contract.deterministic,
                authority: contract.authority,
                replicationSafe: false,
                reason: "missing-api",
            };
            emit(MULTIPLAYER_BOUNDARY_EVALUATED_SIGNAL, missingApi);
            return missingApi;
        }

        const actorMatchesAuthority =
            contract.authority === "shared" ||
            contract.authority === action.actor;

        if (!actorMatchesAuthority) {
            const blocked: MultiplayerBoundaryEvaluation = {
                ok: false,
                contractId: contract.id,
                api: normalizedApi,
                actor: action.actor,
                deterministic: contract.deterministic,
                authority: contract.authority,
                replicationSafe: false,
                reason: "actor-authority-mismatch",
            };
            emit(MULTIPLAYER_BOUNDARY_EVALUATED_SIGNAL, blocked);
            return blocked;
        }

        const replicationSafe =
            contract.replicationSafeApis.includes(normalizedApi);
        if (!replicationSafe) {
            const blocked: MultiplayerBoundaryEvaluation = {
                ok: false,
                contractId: contract.id,
                api: normalizedApi,
                actor: action.actor,
                deterministic: contract.deterministic,
                authority: contract.authority,
                replicationSafe: false,
                reason: "api-not-replication-safe",
            };
            emit(MULTIPLAYER_BOUNDARY_EVALUATED_SIGNAL, blocked);
            return blocked;
        }

        const ok: MultiplayerBoundaryEvaluation = {
            ok: true,
            contractId: contract.id,
            api: normalizedApi,
            actor: action.actor,
            deterministic: contract.deterministic,
            authority: contract.authority,
            replicationSafe: true,
            reason: null,
        };
        emit(MULTIPLAYER_BOUNDARY_EVALUATED_SIGNAL, ok);
        return ok;
    };

    const getReadinessReport = (): MultiplayerReadinessReport => {
        const contracts = Array.from(contractsById.values());

        const nonDeterministicContracts = contracts
            .filter((contract) => !contract.deterministic)
            .map((contract) => contract.id)
            .sort((a, b) => a.localeCompare(b));

        const replicationSafeApiCount = contracts.reduce((sum, contract) => {
            return sum + contract.replicationSafeApis.length;
        }, 0);

        return {
            totalContracts: contracts.length,
            deterministicContracts: contracts.filter(
                (contract) => contract.deterministic,
            ).length,
            serverAuthorityContracts: contracts.filter(
                (contract) => contract.authority === "server",
            ).length,
            sharedAuthorityContracts: contracts.filter(
                (contract) => contract.authority === "shared",
            ).length,
            clientAuthorityContracts: contracts.filter(
                (contract) => contract.authority === "client",
            ).length,
            replicationSafeApiCount,
            nonDeterministicContracts,
        };
    };

    return {
        registerContract,
        unregisterContract,
        getContract,
        listContracts,
        isApiReplicationSafe,
        evaluateAction,
        getReadinessReport,
    };
}

export const multiplayerBoundary = createMultiplayerBoundaryService();
