import { simulateRead, simulateSuccess } from "./client";
import { staffWorkload, tasks } from "@/data/dashboard/tasks";
import type { StaffAvailability, Task } from "@/lib/dashboard/types";
import type { CreateTeamTaskInput } from "./types";
import { supabase, withSupabaseFallback } from "./supabase";

/* ── Invite ───────────────────────────────────────────────────────── */

export type TeamRole = "CEO" | "Planner" | "Customs" | "Service";

export interface InviteTeamMemberInput {
  email: string;
  role: TeamRole;
  message?: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: TeamRole;
  status: "Pending";
  invitedAt: string;
}

/**
 * Invite a new team member.
 *
 * Live: inserts a row into `team_invitations` (email, role, message, status=pending).
 * Mock: returns a synthesised invitation record immediately.
 */
export async function inviteTeamMember(
  input: InviteTeamMemberInput,
): Promise<TeamInvitation> {
  const id = `INV-${Math.floor(Math.random() * 9000 + 1000)}`;
  const draft: TeamInvitation = {
    id,
    email: input.email,
    role: input.role,
    status: "Pending",
    invitedAt: new Date().toISOString(),
  };

  return withSupabaseFallback(
    "team_invitations",
    async () => {
      const { error } = await supabase.from("team_invitations").insert({
        email: input.email,
        role: input.role.toLowerCase(),
        message: input.message ?? null,
        status: "pending",
      });
      if (error) throw error;
      return draft;
    },
    () => Promise.resolve(draft),
  );
}

export async function getTeamMembers(): Promise<StaffAvailability[]> {
  return simulateRead(() => staffWorkload);
}

export async function getTeamTasks(): Promise<Task[]> {
  return simulateRead(() => tasks);
}

export async function createTeamTask(
  input: CreateTeamTaskInput,
): Promise<Task> {
  const id = `T-${Math.floor(Math.random() * 9000 + 1000)}`;
  const draft: Task = {
    id,
    title: input.title,
    owner: input.owner,
    due: input.due,
    priority: input.priority,
    related: input.related,
    status: input.status ?? "Open",
  };
  return simulateSuccess(draft);
}
