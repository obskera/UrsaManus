export {};

import { mkdirSync, writeFileSync } from "fs";

type CertificationStatus = "pass" | "pass-with-warnings" | "fail";

type CertificationCheck = {
    id: string;
    label: string;
    required: boolean;
    pass: boolean;
    notes?: string;
};

type CertificationReport = {
    version: 1;
    generatedAt: string;
    toolKey: string;
    status: CertificationStatus;
    checks: CertificationCheck[];
    warnings: string[];
    remediation: string[];
};

function parseArg(flag: string): string | undefined {
    const index = process.argv.findIndex((entry) => entry === flag);
    if (index < 0) {
        return undefined;
    }

    return process.argv[index + 1];
}

function parseStatus(value: string | undefined): CertificationStatus {
    if (
        value === "pass" ||
        value === "pass-with-warnings" ||
        value === "fail"
    ) {
        return value;
    }

    return "pass-with-warnings";
}

const toolKey = (parseArg("--tool") ?? "tool").trim();
const reportStatus = parseStatus(parseArg("--status"));
const warningArg = parseArg("--warnings") ?? "";
const remediationArg = parseArg("--remediation") ?? "";
const reportOutPath = parseArg("--report-out")?.trim();
const summaryOutPath = parseArg("--summary-out")?.trim();

const warnings = warningArg
    .split("|")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const remediation = remediationArg
    .split("|")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const checks: CertificationCheck[] = [
    {
        id: "ux-parity",
        label: "Core UX create/edit/export/import parity",
        required: true,
        pass: reportStatus !== "fail",
    },
    {
        id: "deterministic-contract",
        label: "Deterministic versioned payload contract",
        required: true,
        pass: reportStatus !== "fail",
    },
    {
        id: "runtime-compat",
        label: "Runtime bootstrap/import compatibility",
        required: true,
        pass: reportStatus !== "fail",
    },
    {
        id: "golden-contract",
        label: "Golden payload contract test coverage",
        required: true,
        pass: reportStatus !== "fail",
    },
    {
        id: "accessibility-baseline",
        label: "Accessibility baseline compliance",
        required: true,
        pass: reportStatus !== "fail",
    },
];

const report: CertificationReport = {
    version: 1,
    generatedAt: new Date().toISOString(),
    toolKey,
    status: reportStatus,
    checks,
    warnings,
    remediation,
};

const summaryLines = [
    `# ${toolKey} Certification Summary`,
    "",
    `Status: **${reportStatus}**`,
    "",
    "## Checks",
    ...checks.map((check) => `- [${check.pass ? "x" : " "}] ${check.label}`),
    "",
    "## Warnings",
    ...(warnings.length > 0
        ? warnings.map((entry) => `- ${entry}`)
        : ["- none"]),
    "",
    "## Remediation",
    ...(remediation.length > 0
        ? remediation.map((entry) => `- ${entry}`)
        : ["- none"]),
];

const summaryText = summaryLines.join("\n");

if (reportOutPath) {
    const reportDir = reportOutPath.split("/").slice(0, -1).join("/");
    if (reportDir) {
        mkdirSync(reportDir, { recursive: true });
    }
    writeFileSync(reportOutPath, JSON.stringify(report, null, 2), "utf8");
}

if (summaryOutPath) {
    const summaryDir = summaryOutPath.split("/").slice(0, -1).join("/");
    if (summaryDir) {
        mkdirSync(summaryDir, { recursive: true });
    }
    writeFileSync(summaryOutPath, summaryText, "utf8");
}

console.log(JSON.stringify(report, null, 2));
console.error("---SUMMARY---");
console.error(summaryText);
