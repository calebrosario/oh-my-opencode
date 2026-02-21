import { existsSync } from "node:fs"
import { join } from "node:path"
import type { BeadsConfig } from "../../config"
import type { PluginInput } from "@opencode-ai/plugin"
import { log } from "../../shared"

export interface BeadsSyncHookOptions {
  config: BeadsConfig
  ctx: PluginInput
}

const HOOK_NAME = "beads-sync"

export function createBeadsSyncHook(options: BeadsSyncHookOptions) {
  const { config, ctx } = options

  return {
    event: async ({ event }: { event: any }) => {
      log(`[${HOOK_NAME}] Received event`, { eventType: event.type })

      if (event.type === "session.created") {
        if (!config.enabled) {
          log(`[${HOOK_NAME}] Beads integration disabled, skipping auto-init`)
          return
        }

        if (!config.auto_init) {
          log(`[${HOOK_NAME}] Auto-init disabled, skipping`)
          return
        }

        const beadsDir = join(ctx.directory, ".beads")

        if (existsSync(beadsDir)) {
          log(`[${HOOK_NAME}] .beads directory already exists, skipping init`)
          return
        }

        try {
          log(`[${HOOK_NAME}] Initializing beads...`)
          await initBeads(ctx, config)
          log(`[${HOOK_NAME}] Beads initialized successfully`)
        } catch (e) {
          log(`[${HOOK_NAME}] Failed to initialize beads`, { error: e instanceof Error ? e.message : String(e) })
        }
      }

      if (event.type === "session.idle") {
        if (!config.enabled) {
          log(`[${HOOK_NAME}] Beads integration disabled, skipping sync`)
          return
        }

        if (!config.sync_on_idle) {
          log(`[${HOOK_NAME}] Sync on idle disabled, skipping`)
          return
        }

        try {
          log(`[${HOOK_NAME}] Syncing beads...`)
          await syncBeads(ctx, config)
          log(`[${HOOK_NAME}] Beads synced successfully`)
        } catch (e) {
          log(`[${HOOK_NAME}] Failed to sync beads`, { error: e instanceof Error ? e.message : String(e) })
        }
      }

      if (event.type === "session.deleted") {
        if (!config.enabled) {
          log(`[${HOOK_NAME}] Beads integration disabled, skipping cleanup`)
          return
        }

        log(`[${HOOK_NAME}] Session deleted, no cleanup action defined yet`)
      }
    },
  }
}

async function initBeads(ctx: PluginInput, config: BeadsConfig): Promise<void> {
  const { spawn } = await import("bun")
  const baseCommand = config.beads_command ?? "bd"
  const cmd = `${baseCommand} init`

  const args = ["--quiet"]
  if (config.backend === "mcp") {
    args.push("--backend", "mcp")
  }

  const [cli, ...cmdArgs] = cmd.split(" ")
  const proc = spawn([cli, ...cmdArgs], {
    stdout: "pipe",
    stderr: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    throw new Error(`Beads init failed (exit code ${exitCode}): ${stderr}`)
  }
}

async function syncBeads(ctx: PluginInput, config: BeadsConfig): Promise<void> {
  const { spawn } = await import("bun")
  const baseCommand = config.beads_command ?? "bd"
  const cmd = `${baseCommand} sync`

  const [cli, ...cmdArgs] = cmd.split(" ")
  const proc = spawn([cli, ...cmdArgs], {
    stdout: "pipe",
    stderr: "pipe",
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    throw new Error(`Beads sync failed (exit code ${exitCode}): ${stderr}`)
  }
}
