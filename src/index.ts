#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { buildMcpServer } from "./server.js"

// stdout is the JSON-RPC transport for stdio MCP. Diagnostics MUST go to
// stderr only — anything written to stdout corrupts the protocol stream.

// Keep the long-lived server alive across transient errors (e.g. a flaky
// network fetch). Log to stderr; never exit from inside a tool call.
process.on("unhandledRejection", (reason) => {
  console.error("[rigatech-data-mcp] unhandled rejection:", reason)
})
process.on("uncaughtException", (err) => {
  console.error("[rigatech-data-mcp] uncaught exception:", err)
})

async function main(): Promise<void> {
  const server = buildMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("[rigatech-data-mcp] ready on stdio")
}

main().catch((err) => {
  console.error("[rigatech-data-mcp] fatal:", err)
  process.exitCode = 1
})
