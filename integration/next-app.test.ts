import { spawn } from "node:child_process"
import type { ChildProcessWithoutNullStreams } from "node:child_process"
import { once } from "node:events"
import { createServer } from "node:net"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixtureDir = path.join(currentDir, "..", "fixtures", "next-app")

const decodeHtml = (value: string) =>
  value
    .replaceAll("&quot;", "\"")
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")

const extractPayload = (html: string) => {
  const match = html.match(/<pre id="payload">([\s\S]*?)<\/pre>/)
  if (!match) {
    throw new Error(`Could not find payload in HTML:\n${html}`)
  }
  return JSON.parse(decodeHtml(match[1]))
}

const getAvailablePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (address === null || typeof address === "string") {
        server.close(() => reject(new Error("Could not allocate a local port")))
        return
      }
      const { port } = address
      server.close((error) => error ? reject(error) : resolve(port))
    })
  })

type RunResult = {
  stdout: string
  stderr: string
}

const runCommand = (cwd: string, args: ReadonlyArray<string>) =>
  new Promise<RunResult>((resolve, reject) => {
    const child = spawn("pnpm", args, {
      cwd,
      env: {
        ...process.env,
        CI: "true"
      },
      stdio: "pipe"
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString()
    })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      reject(new Error(`pnpm ${args.join(" ")} failed with code ${code}\nstdout:\n${stdout}\nstderr:\n${stderr}`))
    })
  })

const waitForExit = async (child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals) => {
  child.kill(signal)
  const timer = setTimeout(() => {
    if (!child.killed) {
      child.kill("SIGKILL")
    }
  }, 5_000)
  try {
    await once(child, "exit")
  } finally {
    clearTimeout(timer)
  }
}

const waitForServer = async(baseUrl: string, child: ChildProcessWithoutNullStreams, output: () => string) => {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next server exited early with code ${child.exitCode}\n${output()}`)
    }
    try {
      const response = await fetch(baseUrl)
      await response.text()
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  throw new Error(`Timed out waiting for Next server at ${baseUrl}\n${output()}`)
}

describe("real Next.js integration", () => {
  let server: ChildProcessWithoutNullStreams | undefined
  let port = 0
  let baseUrl = ""
  let serverOutput = ""

  beforeAll(async () => {
    await runCommand(fixtureDir, ["exec", "next", "build"])

    port = await getAvailablePort()
    baseUrl = `http://127.0.0.1:${port}`

    server = spawn("pnpm", ["exec", "next", "start", "-p", String(port), "-H", "127.0.0.1"], {
      cwd: fixtureDir,
      env: {
        ...process.env,
        CI: "true"
      },
      stdio: "pipe"
    })

    server.stdout.on("data", (chunk: Buffer | string) => {
      serverOutput += chunk.toString()
    })
    server.stderr.on("data", (chunk: Buffer | string) => {
      serverOutput += chunk.toString()
    })

    await waitForServer(baseUrl, server, () => serverOutput)
  })

  afterAll(async () => {
    if (server && server.exitCode === null) {
      await waitForExit(server, "SIGTERM")
    }
  })

  it("reads headers, cookies, and draft mode inside a real Next page", async () => {
    const response = await fetch(`${baseUrl}/headers`, {
      headers: {
        cookie: "session=page-cookie",
        "x-request-id": "page-request"
      }
    })

    expect(response.status).toBe(200)

    const html = await response.text()
    expect(extractPayload(html)).toEqual({
      draftMode: false,
      requestId: "page-request",
      session: "page-cookie"
    })
  })

  it("provides middleware services inside a real Next page", async () => {
    const response = await fetch(`${baseUrl}/middleware`, {
      headers: {
        "x-request-id": "middleware-request"
      }
    })

    expect(response.status).toBe(200)

    const html = await response.text()
    expect(extractPayload(html)).toEqual({
      requestId: "middleware-request"
    })
  })

  it("keeps request state isolated across concurrent route handler requests", async () => {
    const requestIds = Array.from({ length: 12 }, (_, index) => `request-${index}`)

    const responses = await Promise.all(
      requestIds.map(async(requestId) => {
        const response = await fetch(`${baseUrl}/api/request-data`, {
          headers: {
            cookie: `session=${requestId}`,
            "x-request-id": requestId
          }
        })
        expect(response.status).toBe(200)
        return response.json()
      })
    )

    expect(responses).toEqual(
      requestIds.map((requestId) => ({
        directRequestId: requestId,
        middlewareRequestId: requestId,
        session: requestId
      }))
    )
  })

  it("allows route handlers to set cookies through the library wrapper", async () => {
    const response = await fetch(`${baseUrl}/api/set-cookie`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(response.headers.get("set-cookie")).toContain("session=set-by-route")
  })

  it("preserves redirect control flow in a real Next page", async () => {
    const response = await fetch(`${baseUrl}/redirect`, {
      redirect: "manual"
    })

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("/redirect-target")
  })

  it("preserves notFound control flow in a real Next page", async () => {
    const response = await fetch(`${baseUrl}/not-found`)
    expect(response.status).toBe(404)
  })
})
