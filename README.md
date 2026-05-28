# @rigatech/mcp

Local **stdio** MCP server for the RigaTech ecosystem — exposes **jobs**, **courses**, and **events** from [`rinkevich/rigatech-data`](https://github.com/rinkevich/rigatech-data). Read-only, no authentication.

This is the local counterpart to the hosted server at **[mcp.riga.tech](https://mcp.riga.tech)**: same data, same Zod validation, but it runs as a local child process over stdio instead of an HTTP bridge. Use it when you want a self-contained local process, to pin a specific data ref, or to run against a local checkout.

## Quick start

```bash
npx -y @rigatech/mcp
# or, with pnpm:
pnpm dlx @rigatech/mcp
```

It speaks MCP over stdio, so you normally don't run it by hand — your MCP client launches it for you (see below). When run directly it prints `ready on stdio` to **stderr** and then waits for JSON-RPC on stdin.

## Add to your client

Add this to your MCP client config:

```json
{
  "mcpServers": {
    "rigatech": {
      "command": "npx",
      "args": ["-y", "@rigatech/mcp"]
    }
  }
}
```

Config file locations:

| Client                              | Path                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Claude Desktop                      | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) |
| Claude Code                         | `.mcp.json` in your project, or `~/.claude.json`                          |
| Cursor                              | `~/.cursor/mcp.json`                                                      |
| VS Code (Continue / MCP extensions) | the extension's `mcp.json`                                                |

It can coexist with the hosted server — just give them different keys (e.g. `rigatech` for this local one and `rigatech-remote` for `npx -y mcp-remote https://mcp.riga.tech`).

## Tools

| Tool           | Parameters (all optional)                                                                                                                                                                                        | Description                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `list_jobs`    | `remote` (`onsite`\|`hybrid`\|`remote`), `seniority` (`junior`\|`mid`\|`senior`\|`staff`\|`lead`), `employment` (`full-time`\|`part-time`\|`contract`\|`intern`), `stack` (string[]), `search` (string)          | Open positions in the Latvian / Baltic tech ecosystem, filterable by stack and seniority. |
| `list_courses` | `mode` (`cohort`\|`self-paced`), `level` (`beginner`\|`intermediate`\|`advanced`), `format` (`online`\|`in-person`\|`hybrid`), `language` (`en`\|`lv`\|`ru`\|`mixed`), `topicTags` (string[]), `search` (string) | Cohort and self-paced programs (bootcamps, tracks, courses).                              |
| `list_events`  | `kind` (`meetup`\|`conference`\|`hackathon`\|`workshop`\|`other`), `location` (string), `techTags` (string[]), `audienceTags` (string[]), `upcomingOnly` (boolean)                                               | Upcoming meetups, conferences, hackathons, and workshops.                                 |

`stack` / `topicTags` / `techTags` / `audienceTags` match if the item contains **at least one** of the given values (case-insensitive). `search` is a case-insensitive substring match over the title, organization, and English summary.

Each tool returns a `structuredContent` object `{ count, items }` plus a pretty-printed JSON copy of `items` in `content[0].text`.

## Configuration (environment variables)

| Variable            | Default  | Purpose                                                                                          |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `GITHUB_TOKEN`      | —        | Optional. Raises the GitHub API rate limit (60/hr → 5000/hr). Sent on both API and raw requests. |
| `RIGATECH_DATA_REF` | `master` | Branch / tag / commit of `rigatech-data` to read.                                                |
| `RIGATECH_DATA_DIR` | —        | Read from a local checkout of `rigatech-data` on disk instead of GitHub (offline dev).           |

Pass env vars through your client config:

```json
{
  "mcpServers": {
    "rigatech": {
      "command": "npx",
      "args": ["-y", "@rigatech/mcp"],
      "env": { "GITHUB_TOKEN": "ghp_…" }
    }
  }
}
```

## How it works

On the first call to a tool, the server lists the relevant directory in the public `rigatech-data` repo via the GitHub Contents API, fetches each JSON file from the raw CDN (bounded concurrency), validates every entry with the same Zod schemas used by `mcp.riga.tech`, and skips anything invalid. Results are cached in memory per dataset for 5 minutes, so repeated calls in a session are instant. The server never writes anything.

## Development

```bash
git clone https://github.com/rinkevich/rigatech-data-mcp.git
cd rigatech-data-mcp
pnpm install
pnpm build             # tsc -> dist/
pnpm start             # node dist/index.js

pnpm typecheck         # type-check without emitting

# Inspect interactively:
npx @modelcontextprotocol/inspector node dist/index.js

# Run against a local checkout of the data repo (offline):
RIGATECH_DATA_DIR=/path/to/rigatech-data node dist/index.js
```

> Note: stdout is the MCP transport. All diagnostics go to **stderr** — never write to stdout.

## Releasing

CI (`.github/workflows/ci.yml`) runs typecheck + lint + build on every push/PR to `master`. Publishing is automated by `.github/workflows/release.yml`, which publishes to npm when a `vX.Y.Z` tag is pushed (or via manual **workflow_dispatch**).

One-time setup — add an npm **automation** access token as a repo secret (automation tokens bypass 2FA, which this npm account enforces):

```bash
# npmjs.com -> Access Tokens -> Generate New Token -> "Automation"
gh secret set NPM_TOKEN   # paste the token when prompted
```

Cut a release:

```bash
pnpm version patch        # bumps version, creates a commit + vX.Y.Z tag
git push --follow-tags    # pushing the tag triggers the release workflow
```

The release workflow verifies the tag matches `package.json`, then runs `pnpm publish --access public` with npm provenance.

## Data source

Data lives in [`github.com/rinkevich/rigatech-data`](https://github.com/rinkevich/rigatech-data) (`master`). Hosted MCP: [mcp.riga.tech](https://mcp.riga.tech). Website: [riga.tech](https://riga.tech).

## License

MIT © Andrejs Rinkevics
