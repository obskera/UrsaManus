import { readdirSync, readFileSync } from "fs";

type CertificationStatus = "pass" | "pass-with-warnings" | "fail";

type CertificationCheck = {
    id?: string;
    pass?: boolean;
    status?: string;
};

type CertificationReport = {
    toolKey?: string;
    status?: CertificationStatus;
    checks?: CertificationCheck[];
};

const hasAccessibilityBaselinePass = (report: CertificationReport): boolean => {
    const checks = Array.isArray(report.checks) ? report.checks : [];
    const accessibilityCheck = checks.find(
        (check) => check.id === "accessibility-baseline",
    );
    if (!accessibilityCheck) {
        return false;
    }

    if (accessibilityCheck.pass === true) {
        return true;
    }

    return accessibilityCheck.status === "pass";
};

const parseArg = (flag: string): string | undefined => {
    const index = process.argv.findIndex((entry) => entry === flag);
    if (index < 0) {
        return undefined;
    }

    return process.argv[index + 1];
};

const reportsDir = parseArg("--dir") ?? "certification";
const allowWarnings = parseArg("--allow-warnings") !== "false";

const files = readdirSync(reportsDir).filter((entry) =>
    entry.endsWith(".report.json"),
);

if (files.length === 0) {
    console.error(`No certification report artifacts found in ${reportsDir}`);
    process.exit(1);
}

const failures: string[] = [];
const warnings: string[] = [];
const accessibilityFailures: string[] = [];

for (const file of files) {
    const raw = readFileSync(`${reportsDir}/${file}`, "utf8");
    const parsed = JSON.parse(raw) as CertificationReport;
    const status = parsed.status;
    const toolKey = parsed.toolKey ?? file;

    if (status === "fail") {
        failures.push(toolKey);
        continue;
    }

    if (status === "pass-with-warnings") {
        warnings.push(toolKey);
    }

    if (!hasAccessibilityBaselinePass(parsed)) {
        accessibilityFailures.push(toolKey);
    }
}

if (failures.length > 0) {
    console.error(
        `Certification status check failed; tools in fail state: ${failures.join(", ")}`,
    );
    process.exit(1);
}

if (!allowWarnings && warnings.length > 0) {
    console.error(
        `Certification status check failed; warnings not allowed: ${warnings.join(", ")}`,
    );
    process.exit(1);
}

if (accessibilityFailures.length > 0) {
    console.error(
        `Certification status check failed; missing accessibility baseline pass check: ${accessibilityFailures.join(", ")}`,
    );
    process.exit(1);
}

console.log(
    `Certification status check passed (${files.length} reports; warnings: ${warnings.length}).`,
);
