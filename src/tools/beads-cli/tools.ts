import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"
import type { BeadsConfig } from "../../config"
import { BeadsWrapper } from "./wrapper"
import { BdCreateOptions, BdUpdateOptions, BdCloseOptions, BdDependencyType } from "../../features/beads-integration/types"

export interface BeadsToolOptions {
  config: BeadsConfig
}

export function createBeadsTool(options: BeadsToolOptions): ToolDefinition {
  return tool({
    description: "Beads task management via CLI wrapper",
    args: {
      command: tool.schema
        .enum(["ready", "create", "update", "close", "sync", "claim", "reopen", "block", "dep-add", "dep-remove"])
        .describe("Beads command to execute"),
      title: tool.schema.string().optional().describe("Issue title for create/update"),
      issue_id: tool.schema.string().optional().describe("Issue ID for update/close/claim/reopen/block/dep operations"),
      priority: tool.schema
        .number()
        .min(0)
        .max(4)
        .optional()
        .describe("Priority (0-4): 0=critical, 1=high, 2=medium, 3=low, 4=backlog"),
      issue_type: tool.schema
        .enum(["bug", "feature", "task", "epic", "chore", "decision"])
        .optional()
        .describe("Issue type for create"),
      description: tool.schema.string().optional().describe("Issue description for create/update"),
      assignee: tool.schema.string().optional().describe("Assignee for create/update"),
      reason: tool.schema.string().optional().describe("Close reason for close"),
      dependencies: tool.schema
        .string()
        .optional()
        .describe("Dependencies in format \"type:id,type:id\" for create"),
      dep_type: tool.schema
        .enum(["blocks", "parent-child", "discovered-from", "related", "waits-for"])
        .optional()
        .describe("Dependency type for dep-add"),
      dep_id: tool.schema.string().optional().describe("Dependent issue ID for dep-add/dep-remove"),
    },
    execute: async (args) => {
      const wrapper = new BeadsWrapper({ config: options.config })

      switch (args.command) {
        case "ready":
          try {
            const issues = await wrapper.ready()
            return `Found ${issues.length} ready issues:\n\n${issues.map((i: { id: string; title: string; priority: number }) => `- [${i.id}] ${i.title} (priority: ${i.priority})`).join("\n")}`
          } catch (e) {
            return `Error fetching ready issues: ${e instanceof Error ? e.message : String(e)}`
          }

        case "create":
          try {
            const createOptions: BdCreateOptions = {}
            if (args.priority !== undefined) createOptions.priority = args.priority
            if (args.issue_type) createOptions.issue_type = args.issue_type
            if (args.description) createOptions.description = args.description
            if (args.assignee) createOptions.assignee = args.assignee

            if (args.dependencies) {
              createOptions.dependencies = args.dependencies.split(",").map(d => {
                const [type, id] = d.trim().split(":")
                return { type: type as BdDependencyType, id: id.trim() }
              })
            }

            if (!args.title) {
              return "Error: 'title' is required for create command"
            }

            const result = await wrapper.create(args.title, createOptions)
            if (result) {
              return `Created issue: ${result.id}\nTitle: ${result.title}\nStatus: ${result.status}`
            } else {
              return "Failed to create issue"
            }
          } catch (e) {
            return `Error creating issue: ${e instanceof Error ? e.message : String(e)}`
          }

        case "update":
          try {
            if (!args.issue_id) {
              return "Error: 'issue_id' is required for update command"
            }

            const updateOptions: BdUpdateOptions = {}
            if (args.priority !== undefined) updateOptions.priority = args.priority
            if (args.assignee) updateOptions.assignee = args.assignee
            if (args.title) updateOptions.title = args.title
            if (args.description) updateOptions.description = args.description

            const result = await wrapper.update(args.issue_id, updateOptions)
            if (result) {
              return `Updated issue: ${result.id}\nStatus: ${result.status}`
            } else {
              return "Failed to update issue"
            }
          } catch (e) {
            return `Error updating issue: ${e instanceof Error ? e.message : String(e)}`
          }

        case "close":
          try {
            if (!args.issue_id) {
              return "Error: 'issue_id' is required for close command"
            }

            const closeOptions: BdCloseOptions = {}
            if (args.reason) closeOptions.reason = args.reason

            const result = await wrapper.close(args.issue_id, closeOptions)
            if (result) {
              return `Closed issue: ${result.id}\nStatus: ${result.status}`
            } else {
              return "Failed to close issue"
            }
          } catch (e) {
            return `Error closing issue: ${e instanceof Error ? e.message : String(e)}`
          }

        case "claim":
          try {
            if (!args.issue_id) {
              return "Error: 'issue_id' is required for claim command"
            }

            const result = await wrapper.claim(args.issue_id, args.assignee)
            if (result) {
              return `Claimed issue: ${result.id}\nAssignee: ${result.assignee}`
            } else {
              return "Failed to claim issue"
            }
          } catch (e) {
            return `Error claiming issue: ${e instanceof Error ? e.message : String(e)}`
          }

        case "reopen":
          try {
            if (!args.issue_id) {
              return "Error: 'issue_id' is required for reopen command"
            }

            const result = await wrapper.reopen(args.issue_id)
            if (result) {
              return `Reopened issue: ${result.id}\nStatus: ${result.status}`
            } else {
              return "Failed to reopen issue"
            }
          } catch (e) {
            return `Error reopening issue: ${e instanceof Error ? e.message : String(e)}`
          }

        case "block":
          try {
            if (!args.issue_id) {
              return "Error: 'issue_id' is required for block command"
            }

            const result = await wrapper.block(args.issue_id)
            if (result) {
              return `Blocked issue: ${result.id}\nStatus: ${result.status}`
            } else {
              return "Failed to block issue"
            }
          } catch (e) {
            return `Error blocking issue: ${e instanceof Error ? e.message : String(e)}`
          }

        case "sync":
          try {
            const success = await wrapper.sync()
            return success ? "Beads synced successfully" : "Failed to sync beads"
          } catch (e) {
            return `Error syncing beads: ${e instanceof Error ? e.message : String(e)}`
          }

        case "dep-add":
          try {
            if (!args.issue_id || !args.dep_id || !args.dep_type) {
              return "Error: 'issue_id', 'dep_id', and 'dep_type' are required for dep-add command"
            }

            const success = await wrapper.depAdd(args.issue_id, args.dep_id, args.dep_type)
            return success ? "Dependency added successfully" : "Failed to add dependency"
          } catch (e) {
            return `Error adding dependency: ${e instanceof Error ? e.message : String(e)}`
          }

        case "dep-remove":
          try {
            if (!args.issue_id || !args.dep_id) {
              return "Error: 'issue_id' and 'dep_id' are required for dep-remove command"
            }

            const success = await wrapper.depRemove(args.issue_id, args.dep_id)
            return success ? "Dependency removed successfully" : "Failed to remove dependency"
          } catch (e) {
            return `Error removing dependency: ${e instanceof Error ? e.message : String(e)}`
          }

        default:
          return `Unknown command: ${args.command}`
      }
    },
  })
}
