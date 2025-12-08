import { z } from 'zod'

export const WorkItem = z.object({ exercise: z.string(), sets: z.number().int().positive(), reps: z.string(), intensity: z.string().optional() })
export const Day = z.object({ day: z.string(), work: z.array(WorkItem).min(4) })
export const Week = z.object({ week: z.number().int().positive(), days: z.array(Day).min(3) })
export const Plan = z.object({ title: z.string(), weeks: z.array(Week).length(9) })
export type PlanType = z.infer<typeof Plan>
