import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import {
  handleListCourses,
  handleListEvents,
  handleListJobs,
  listCoursesInput,
  listEventsInput,
  listJobsInput,
} from "./tools.js"

export function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: "rigatech",
    version: "0.1.0",
  })

  server.registerTool(
    "list_jobs",
    {
      title: "List jobs",
      description:
        "Open positions in the Latvian / Baltic tech ecosystem, filterable by stack and seniority. Returns a list of job entries from rigatech-data.",
      inputSchema: listJobsInput,
    },
    (args) => handleListJobs(args)
  )

  server.registerTool(
    "list_courses",
    {
      title: "List courses",
      description:
        "Cohort and self-paced programs (bootcamps, tracks, courses) from the rigatech-data catalogue.",
      inputSchema: listCoursesInput,
    },
    (args) => handleListCourses(args)
  )

  server.registerTool(
    "list_events",
    {
      title: "List events",
      description:
        "Upcoming meetups, conferences, hackathons, and workshops from rigatech-data.",
      inputSchema: listEventsInput,
    },
    (args) => handleListEvents(args)
  )

  return server
}
