import type { CheckResult } from "../types"
import { CHECK_IDS, CHECK_NAMES } from "../constants"

export interface BeadsInfo {
  installed: boolean
  version: string | null
  path: string | null
  configEnabled: boolean
  error: string | null
}

async function checkBinaryExists(binary: string): Promise<{ exists: boolean; path: string | null }> {
  try {
    const proc = Bun.spawn(["which", binary], { stdout: "pipe", stderr: "pipe" })
    const output = await new Response(proc.stdout).text()
    await proc.exited
    if (proc.exitCode === 0) {
      return { exists: true, path: output.trim() }
    }
  } catch {
    // intentionally empty - binary not found
  }
  return { exists: false, path: null }
}

async function getBeadsVersion(): Promise<string | null> {
  try {
    const proc = Bun.spawn(["bd", "--version"], { stdout: "pipe", stderr: "pipe" })
    const output = await new Response(proc.stdout).text()
    await proc.exited
    if (proc.exitCode === 0) {
      return output.trim().split("\n")[0]
    }
  } catch {
    // intentionally empty - version unavailable
  }
  return null
}

export async function getBeadsInfo(): Promise<BeadsInfo> {
  const binaryCheck = await checkBinaryExists("bd")

  if (!binaryCheck.exists) {
    return {
      installed: false,
      version: null,
      path: null,
      configEnabled: false,
      error: null,
    }
  }

  const version = await getBeadsVersion()

  return {
    installed: true,
    version,
    path: binaryCheck.path,
    configEnabled: false,
    error: null,
  }
}

export async function checkBeads(): Promise<CheckResult> {
  const info = await getBeadsInfo()
  const name = CHECK_NAMES[CHECK_IDS.BEADS]

  if (!info.installed) {
    return {
      name,
      status: "warn",
      message: "Not installed (optional)",
      details: [
        "Beads is a task management CLI for tracking issues",
        "Install: https://github.com/steveyegge/beads",
        "Enable in config: beads.enabled = true",
      ],
      issues: [],
    }
  }

  const details: string[] = []
  if (info.path) details.push(`Path: ${info.path}`)

  return {
    name,
    status: "pass",
    message: `${info.version ?? "installed"}`,
    details: details.length > 0 ? details : undefined,
    issues: [],
  }
}
