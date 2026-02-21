import { describe, expect, test, mock } from "bun:test"
import { BeadsWrapper } from "./wrapper"
import type { BeadsConfig } from "../../config"
import type { BdIssue } from "../../features/beads-integration/types"

/**
 * Helper to create a complete BeadsConfig with defaults
 */
function createTestConfig(overrides: Partial<BeadsConfig> = {}): BeadsConfig {
  return {
    enabled: true,
    auto_init: true,
    backend: "cli",
    sync_on_idle: true,
    beads_command: "bd",
    ...overrides,
  }
}

/**
 * Helper to create a minimal BdIssue for testing
 */
function createTestIssue(overrides: Partial<BdIssue> = {}): BdIssue {
  return {
    id: "bd-test123",
    title: "Test Issue",
    status: "open",
    priority: 2,
    issue_type: "task",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("BeadsWrapper", () => {
  describe("buildCommand", () => {
    test("builds basic command", () => {
      const config = createTestConfig()
      const wrapper = new BeadsWrapper({ config })
      const cmd = (wrapper as any).buildCommand("ready")
      expect(cmd).toBe("bd ready")
    })

    test("uses custom beads_command when specified", () => {
      const config = createTestConfig({
        beads_command: "/usr/local/bin/bd",
      })
      const wrapper = new BeadsWrapper({ config })
      const cmd = (wrapper as any).buildCommand("sync")
      expect(cmd).toBe("/usr/local/bin/bd sync")
    })

    test("includes args in command", () => {
      const config = createTestConfig()
      const wrapper = new BeadsWrapper({ config })
      const cmd = (wrapper as any).buildCommand("create", ['"Test Issue"', "--priority=1"])
      expect(cmd).toBe('bd create "Test Issue" --priority=1')
    })
  })

  describe("with mocked exec", () => {
    test("ready returns parsed issues", async () => {
      const mockIssues = [createTestIssue({ id: "bd-abc123", title: "Test Issue", priority: 1 })]

      const config = createTestConfig()
      const wrapper = new BeadsWrapper({ config })

      const execMock = mock(() => Promise.resolve(JSON.stringify(mockIssues)))
      ;(wrapper as any).exec = execMock

      const result = await wrapper.ready()
      expect(result).toEqual(mockIssues)
    })

    test("create returns parsed issue", async () => {
      const mockIssue = createTestIssue({ id: "bd-xyz789", title: "New Issue", priority: 2 })

      const config = createTestConfig()
      const wrapper = new BeadsWrapper({ config })

      const execMock = mock(() => Promise.resolve(JSON.stringify(mockIssue)))
      ;(wrapper as any).exec = execMock

      const result = await wrapper.create("New Issue", { priority: 2 })
      expect(result).toEqual(mockIssue)
    })

    test("sync returns true on success", async () => {
      const config = createTestConfig()
      const wrapper = new BeadsWrapper({ config })

      const execMock = mock(() => Promise.resolve(""))
      ;(wrapper as any).exec = execMock

      const result = await wrapper.sync()
      expect(result).toBe(true)
    })

    test("sync returns false on failure", async () => {
      const config = createTestConfig()
      const wrapper = new BeadsWrapper({ config })

      const execMock = mock(() => Promise.reject(new Error("Command failed")))
      ;(wrapper as any).exec = execMock

      const result = await wrapper.sync()
      expect(result).toBe(false)
    })

    test("claim calls update with claim flag", async () => {
      const mockIssue = createTestIssue({
        id: "bd-test",
        title: "Test",
        status: "in_progress",
        assignee: "agent-1",
      })

      const config = createTestConfig()
      const wrapper = new BeadsWrapper({ config })

      const execMock = mock(() => Promise.resolve(JSON.stringify(mockIssue)))
      ;(wrapper as any).exec = execMock

      const result = await wrapper.claim("bd-test", "agent-1")
      expect(result).toEqual(mockIssue)
      expect(execMock).toHaveBeenCalledWith(expect.stringContaining("--claim"))
    })
  })
})
