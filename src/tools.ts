import type { CourseItem, EventItem, JobItem } from "./schemas.js"

import { z } from "zod"

import { fetchAllCourses, fetchAllEvents, fetchAllJobs } from "./source.js"

type ToolResult = {
  content: { type: "text"; text: string }[]
  structuredContent: { count: number; items: unknown[] }
}

function ok(items: unknown[]): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
    structuredContent: { count: items.length, items },
  }
}

function matchesSearch(haystack: string[], needle: string): boolean {
  const q = needle.toLowerCase()
  return haystack.some((s) => s.toLowerCase().includes(q))
}

function intersects(a: string[], b: string[]): boolean {
  if (b.length === 0) return true
  const set = new Set(a.map((s) => s.toLowerCase()))
  return b.some((t) => set.has(t.toLowerCase()))
}

export const listJobsInput = {
  remote: z
    .enum(["onsite", "hybrid", "remote"])
    .optional()
    .describe("Filter by remote work mode."),
  seniority: z
    .enum(["junior", "mid", "senior", "staff", "lead"])
    .optional()
    .describe("Filter by seniority level."),
  employment: z
    .enum(["full-time", "part-time", "contract", "intern"])
    .optional()
    .describe("Filter by employment type."),
  stack: z
    .array(z.string())
    .optional()
    .describe(
      "Filter to jobs whose stack contains at least one of these technologies (case-insensitive)."
    ),
  search: z
    .string()
    .optional()
    .describe(
      "Free-text search over title, company, and English summary (case-insensitive substring)."
    ),
}

export async function handleListJobs(
  args: {
    remote?: "onsite" | "hybrid" | "remote"
    seniority?: "junior" | "mid" | "senior" | "staff" | "lead"
    employment?: "full-time" | "part-time" | "contract" | "intern"
    stack?: string[]
    search?: string
  } = {}
): Promise<ToolResult> {
  const all = await fetchAllJobs()
  const filtered = all.filter((job: JobItem) => {
    if (args.remote && job.remote !== args.remote) return false
    if (args.seniority && job.seniority !== args.seniority) return false
    if (args.employment && job.employment !== args.employment) return false
    if (
      args.stack &&
      args.stack.length > 0 &&
      !intersects(job.stack, args.stack)
    )
      return false
    if (
      args.search &&
      !matchesSearch([job.title, job.company, job.summary.en], args.search)
    )
      return false
    return true
  })
  return ok(filtered)
}

export const listCoursesInput = {
  mode: z
    .enum(["cohort", "self-paced"])
    .optional()
    .describe("Filter by delivery mode."),
  level: z
    .enum(["beginner", "intermediate", "advanced"])
    .optional()
    .describe("Filter by difficulty level."),
  format: z
    .enum(["online", "in-person", "hybrid"])
    .optional()
    .describe("Filter by format."),
  language: z
    .enum(["en", "lv", "ru", "mixed"])
    .optional()
    .describe("Filter by language of instruction."),
  topicTags: z
    .array(z.string())
    .optional()
    .describe(
      "Filter to courses whose topicTags contain at least one of these (case-insensitive)."
    ),
  search: z
    .string()
    .optional()
    .describe(
      "Free-text search over title, provider, and English summary (case-insensitive substring)."
    ),
}

export async function handleListCourses(
  args: {
    mode?: "cohort" | "self-paced"
    level?: "beginner" | "intermediate" | "advanced"
    format?: "online" | "in-person" | "hybrid"
    language?: "en" | "lv" | "ru" | "mixed"
    topicTags?: string[]
    search?: string
  } = {}
): Promise<ToolResult> {
  const all = await fetchAllCourses()
  const filtered = all.filter((course: CourseItem) => {
    if (args.mode && course.mode !== args.mode) return false
    if (args.level && course.level !== args.level) return false
    if (args.format && course.format !== args.format) return false
    if (args.language && course.language !== args.language) return false
    if (
      args.topicTags &&
      args.topicTags.length > 0 &&
      !intersects(course.topicTags, args.topicTags)
    )
      return false
    if (
      args.search &&
      !matchesSearch(
        [course.title.en, course.provider, course.summary.en],
        args.search
      )
    )
      return false
    return true
  })
  return ok(filtered)
}

export const listEventsInput = {
  kind: z
    .enum(["meetup", "conference", "hackathon", "workshop", "other"])
    .optional()
    .describe("Filter by event kind."),
  location: z
    .string()
    .optional()
    .describe("Filter by city/location (case-insensitive substring match)."),
  techTags: z
    .array(z.string())
    .optional()
    .describe(
      "Filter to events whose techTags contain at least one of these (case-insensitive)."
    ),
  audienceTags: z
    .array(z.string())
    .optional()
    .describe(
      "Filter to events whose audienceTags contain at least one of these (case-insensitive)."
    ),
  upcomingOnly: z
    .boolean()
    .optional()
    .describe("If true, only return events whose date is today or later."),
}

export async function handleListEvents(
  args: {
    kind?: "meetup" | "conference" | "hackathon" | "workshop" | "other"
    location?: string
    techTags?: string[]
    audienceTags?: string[]
    upcomingOnly?: boolean
  } = {}
): Promise<ToolResult> {
  const all = await fetchAllEvents()
  const today = new Date().toISOString().slice(0, 10)
  const filtered = all.filter((event: EventItem) => {
    if (args.kind && event.kind !== args.kind) return false
    if (
      args.location &&
      !event.location.toLowerCase().includes(args.location.toLowerCase())
    )
      return false
    if (
      args.techTags &&
      args.techTags.length > 0 &&
      !intersects(event.techTags, args.techTags)
    )
      return false
    if (
      args.audienceTags &&
      args.audienceTags.length > 0 &&
      !intersects(event.audienceTags, args.audienceTags)
    )
      return false
    if (args.upcomingOnly) {
      const end = event.endDate ?? event.date
      if (end < today) return false
    }
    return true
  })
  return ok(filtered)
}
