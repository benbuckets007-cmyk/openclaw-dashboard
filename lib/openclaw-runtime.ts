import { access } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type OpenClawSkillResult = {
  ok: boolean;
  source: string;
  command: string[];
  output: unknown;
  error?: string;
  exitCode?: number | null;
};

type SkillArgs = Record<string, string | number | boolean | null | undefined>;

function getWorkspaceDir() {
  return process.env.OPENCLAW_MARKETING_OPS_WORKSPACE_DIR
    ? path.resolve(process.env.OPENCLAW_MARKETING_OPS_WORKSPACE_DIR)
    : path.join(process.cwd(), "openclaw", "workspaces", "marketing-ops");
}

export function getSkillScriptPath(skillName: string) {
  return path.join(getWorkspaceDir(), "skills", skillName, "index.js");
}

export function buildSkillCommand(skillName: string, action: string, args: SkillArgs = {}) {
  const scriptPath = getSkillScriptPath(skillName);
  const command = [process.execPath, scriptPath, "--action", action];

  Object.entries(args).forEach(([key, value]) => {
    if (value == null) {
      return;
    }

    command.push(`--${key}`);
    command.push(String(value));
  });

  return command;
}

function parseOutput(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

export async function invokeMarketingOpsSkill(
  skillName: string,
  action: string,
  args: SkillArgs = {},
): Promise<OpenClawSkillResult> {
  const command = buildSkillCommand(skillName, action, args);
  const [, scriptPath, ...scriptArgs] = command;

  try {
    await access(scriptPath);
  } catch (error) {
    const failed = error as NodeJS.ErrnoException;
    return {
      ok: false,
      source: skillName,
      command,
      output: null,
      error: failed.message,
      exitCode: null,
    };
  }

  try {
    const { stdout, stderr } = await execFileAsync(command[0], scriptArgs, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        OPENCLAW_MARKETING_OPS_WORKSPACE_DIR: getWorkspaceDir(),
      },
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
    });

    return {
      ok: true,
      source: skillName,
      command,
      output: parseOutput(stdout) ?? parseOutput(stderr),
    };
  } catch (error) {
    const failed = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: string | number;
      signal?: NodeJS.Signals | null;
    };

    const stderrOutput = parseOutput(failed.stderr ?? "");
    const stdoutOutput = parseOutput(failed.stdout ?? "");
    const message =
      typeof stderrOutput === "object" && stderrOutput && "error" in stderrOutput
        ? String((stderrOutput as { error: unknown }).error)
        : typeof stderrOutput === "string" && stderrOutput
          ? stderrOutput
          : typeof stdoutOutput === "object" && stdoutOutput && "error" in stdoutOutput
            ? String((stdoutOutput as { error: unknown }).error)
            : failed.message;

    return {
      ok: false,
      source: skillName,
      command,
      output: stdoutOutput ?? stderrOutput,
      error: message,
      exitCode: typeof failed.code === "number" ? failed.code : null,
    };
  }
}
