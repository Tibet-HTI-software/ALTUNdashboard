import { simulateRead, simulateSuccess } from "./client";
import { staffWorkload, tasks } from "@/data/dashboard/tasks";
import type { StaffAvailability, Task } from "@/lib/dashboard/types";
import type { CreateTeamTaskInput } from "./types";

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
