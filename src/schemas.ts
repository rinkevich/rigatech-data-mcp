import { z } from "zod"

const Bilingual = z.object({
  en: z.string().min(1),
  lv: z.string().min(1),
})

export const EventSchema = z.object({
  slug: z.string().min(1),
  title: Bilingual,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  location: z.string().min(1),
  venue: z.string().optional(),
  url: z.string().url(),
  organizer: z.string().min(1),
  kind: z.enum(["meetup", "conference", "hackathon", "workshop", "other"]),
  techTags: z.array(z.string()).default([]),
  audienceTags: z.array(z.string()).default([]),
  summary: Bilingual,
  image: z.string().url().optional(),
})

export const JobSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  companyUrl: z.string().url(),
  location: z.string().min(1),
  remote: z.enum(["onsite", "hybrid", "remote"]),
  employment: z.enum(["full-time", "part-time", "contract", "intern"]),
  seniority: z.enum(["junior", "mid", "senior", "staff", "lead"]),
  salaryRange: z.string().optional(),
  stack: z.array(z.string()).default([]),
  summary: Bilingual,
  applyUrl: z.string().url(),
  postedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const CourseSchema = z
  .object({
    slug: z.string().min(1),
    title: Bilingual,
    provider: z.string().min(1),
    providerUrl: z.string().url(),
    url: z.string().url(),
    mode: z.enum(["cohort", "self-paced"]),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    format: z.enum(["online", "in-person", "hybrid"]),
    language: z.enum(["en", "lv", "ru", "mixed"]),
    duration: z.string().min(1),
    cost: z.string().min(1),
    topicTags: z.array(z.string()).default([]),
    summary: Bilingual,
    postedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "cohort" && !data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Cohort courses must have a startDate",
      })
    }
  })

export type EventItem = z.infer<typeof EventSchema>
export type JobItem = z.infer<typeof JobSchema>
export type CourseItem = z.infer<typeof CourseSchema>

export type DatasetKind = "jobs" | "courses" | "events"

export const SCHEMA_BY_KIND = {
  jobs: JobSchema,
  courses: CourseSchema,
  events: EventSchema,
} as const
