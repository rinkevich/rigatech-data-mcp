import type { CourseItem, DatasetKind, EventItem, JobItem } from "./schemas.js"

import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

import {
  CACHE_TTL_MS,
  FETCH_CONCURRENCY,
  GITHUB_TOKEN,
  LOCAL_DIR,
  REPO_NAME,
  REPO_OWNER,
  REPO_REF,
  USER_AGENT,
} from "./config.js"
import { CourseSchema, EventSchema, JobSchema } from "./schemas.js"

type GhContentEntry = {
  name: string
  type: string
  download_url: string | null
}

type Validator<T> = (raw: unknown) => T | null

type CacheEntry = { at: number; data: unknown[] }

// Per-dataset cache so the cold (potentially hundreds of files) fetch happens
// at most once per dataset per CACHE_TTL_MS window.
const cache = new Map<DatasetKind, CacheEntry>()

function ghHeaders(forApi: boolean): Record<string, string> {
  const headers: Record<string, string> = { "User-Agent": USER_AGENT }
  if (forApi) {
    headers.Accept = "application/vnd.github+json"
    headers["X-GitHub-Api-Version"] = "2022-11-28"
  }
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`
  return headers
}

// Bounded-concurrency map: runs `fn` over `items` with at most `limit` in
// flight at a time. Avoids opening hundreds of sockets at once.
async function mapWithConcurrency<I, O>(
  items: I[],
  limit: number,
  fn: (item: I) => Promise<O>
): Promise<O[]> {
  const out = new Array<O>(items.length)
  let cursor = 0
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++
        out[index] = await fn(items[index])
      }
    }
  )
  await Promise.all(workers)
  return out
}

// Lists a dataset directory via the GitHub Contents API. This is the only
// api.github.com call (rate-limited 60/hr unauthenticated); the per-file
// `download_url`s point at raw.githubusercontent.com, which is not.
// Missing dir / errors degrade to an empty list rather than throwing.
async function listDirectory(kind: DatasetKind): Promise<GhContentEntry[]> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${kind}?ref=${REPO_REF}`
  let res: Response
  try {
    res = await fetch(url, { headers: ghHeaders(true) })
  } catch (err) {
    console.error(
      `[rigatech-data-mcp] contents API request failed for ${kind}:`,
      err
    )
    return []
  }
  if (res.status === 404) return []
  if (!res.ok) {
    console.error(
      `[rigatech-data-mcp] contents API for ${kind}: ${res.status} ${res.statusText}`
    )
    return []
  }
  const body = (await res.json()) as unknown
  if (!Array.isArray(body)) return []
  return (body as GhContentEntry[]).filter(
    (entry) =>
      entry.type === "file" &&
      entry.name.endsWith(".json") &&
      Boolean(entry.download_url)
  )
}

async function fetchKindFromGitHub<T>(
  kind: DatasetKind,
  validate: Validator<T>
): Promise<T[]> {
  const entries = await listDirectory(kind)
  const results = await mapWithConcurrency(
    entries,
    FETCH_CONCURRENCY,
    async (entry): Promise<T | null> => {
      try {
        const res = await fetch(entry.download_url as string, {
          headers: ghHeaders(false),
        })
        if (!res.ok) {
          console.error(
            `[rigatech-data-mcp] raw fetch ${entry.name}: ${res.status}`
          )
          return null
        }
        const parsed = validate(await res.json())
        if (parsed === null) {
          console.error(
            `[rigatech-data-mcp] schema validation skipped ${entry.name}`
          )
        }
        return parsed
      } catch (err) {
        console.error(`[rigatech-data-mcp] fetch error ${entry.name}:`, err)
        return null
      }
    }
  )
  return results.filter((item): item is T => item !== null)
}

async function fetchKindFromLocalDir<T>(
  kind: DatasetKind,
  validate: Validator<T>
): Promise<T[]> {
  const dir = join(LOCAL_DIR as string, kind)
  let names: string[]
  try {
    names = (await readdir(dir)).filter((name) => name.endsWith(".json"))
  } catch {
    // Missing or unreadable directory -> empty dataset (e.g. no courses yet).
    return []
  }
  const results = await mapWithConcurrency(
    names,
    FETCH_CONCURRENCY,
    async (name): Promise<T | null> => {
      try {
        const raw = JSON.parse(await readFile(join(dir, name), "utf8"))
        const parsed = validate(raw)
        if (parsed === null) {
          console.error(`[rigatech-data-mcp] schema validation skipped ${name}`)
        }
        return parsed
      } catch (err) {
        console.error(`[rigatech-data-mcp] local read error ${name}:`, err)
        return null
      }
    }
  )
  return results.filter((item): item is T => item !== null)
}

async function fetchKind<T>(
  kind: DatasetKind,
  validate: Validator<T>
): Promise<T[]> {
  const hit = cache.get(kind)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.data as T[]
  }
  const data = LOCAL_DIR
    ? await fetchKindFromLocalDir<T>(kind, validate)
    : await fetchKindFromGitHub<T>(kind, validate)
  cache.set(kind, { at: Date.now(), data })
  return data
}

const validateJob: Validator<JobItem> = (raw) => {
  const parsed = JobSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

const validateCourse: Validator<CourseItem> = (raw) => {
  const parsed = CourseSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

const validateEvent: Validator<EventItem> = (raw) => {
  const parsed = EventSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function fetchAllJobs(): Promise<JobItem[]> {
  return fetchKind("jobs", validateJob)
}

export function fetchAllCourses(): Promise<CourseItem[]> {
  return fetchKind("courses", validateCourse)
}

export function fetchAllEvents(): Promise<EventItem[]> {
  return fetchKind("events", validateEvent)
}
