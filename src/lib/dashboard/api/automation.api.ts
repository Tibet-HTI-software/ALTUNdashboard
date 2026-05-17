import { createApiError, simulateRead, simulateSuccess } from "./client";
import {
  automationKpis,
  automationWorkflows,
  automationEvents,
  automationSuggestions,
  automationRules,
  automationDraftEmail,
} from "@/data/dashboard/automation";
import type { AutomationWorkflow } from "@/lib/dashboard/types";
import type {
  AutomationCenterPayload,
  CreateAutomationTaskInput,
} from "./types";

export async function getAutomationCenter(): Promise<AutomationCenterPayload> {
  return simulateRead(() => ({
    kpis: automationKpis,
    workflows: automationWorkflows,
    events: automationEvents,
    suggestions: automationSuggestions,
    rules: automationRules,
    draftEmail: automationDraftEmail,
  }));
}

export interface AutomationRunResult {
  workflowId: string;
  workflowName: string;
  startedAt: string;
  completedAt: string;
  /** Human-readable summary of the (mock) run output. */
  output: string;
}

export async function runAutomationWorkflow(
  id: string,
): Promise<AutomationRunResult> {
  const wf: AutomationWorkflow | undefined = automationWorkflows.find(
    (w) => w.id === id,
  );
  if (!wf) {
    throw createApiError(`Workflow ${id} not found.`, "not_found");
  }
  const startedAt = new Date().toISOString();
  return simulateSuccess(
    {
      workflowId: wf.id,
      workflowName: wf.name,
      startedAt,
      completedAt: new Date().toISOString(),
      output: `Mock run completed for "${wf.name}". No real automation engine executed.`,
    },
    280,
  );
}

export async function createAutomationTask(
  input: CreateAutomationTaskInput,
): Promise<{
  taskId: string;
  source: CreateAutomationTaskInput["source"];
  sourceId: string;
}> {
  return simulateSuccess({
    taskId: `T-${Math.floor(Math.random() * 9000 + 1000)}`,
    source: input.source,
    sourceId: input.sourceId,
  });
}

export async function markSuggestionReviewed(
  id: string,
): Promise<{ id: string; reviewedAt: string }> {
  const found = automationSuggestions.find((s) => s.id === id);
  if (!found) {
    throw createApiError(`Suggestion ${id} not found.`, "not_found");
  }
  return simulateSuccess({ id, reviewedAt: new Date().toISOString() });
}
