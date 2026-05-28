// Central configuration + env overrides for the rigatech-data MCP server.
// No secrets required: the data source is a public GitHub repository.

/** GitHub owner of the data repository. */
export const REPO_OWNER = "rinkevich"

/** GitHub repository that holds the jobs/courses/events JSON files. */
export const REPO_NAME = "rigatech-data"

/** User-Agent sent with every GitHub request (GitHub requires one). */
export const USER_AGENT = "rigatech-data-mcp"

/** In-memory per-dataset cache lifetime (5 minutes). */
export const CACHE_TTL_MS = 5 * 60_000

/** Max concurrent raw-file fetches (jobs/ has hundreds of files). */
export const FETCH_CONCURRENCY = 12

/** Branch / tag / commit ref to read from. Override with RIGATECH_DATA_REF. */
export const REPO_REF: string = process.env.RIGATECH_DATA_REF ?? "master"

/**
 * Optional GitHub token. Lifts the unauthenticated API rate limit
 * (60/hr -> 5000/hr) and is sent on both the Contents API and raw requests.
 */
export const GITHUB_TOKEN: string | undefined =
  process.env.GITHUB_TOKEN || undefined

/**
 * Optional path to a local checkout of `rigatech-data`. When set, the server
 * reads files from disk instead of GitHub — handy for offline development.
 */
export const LOCAL_DIR: string | undefined =
  process.env.RIGATECH_DATA_DIR || undefined
