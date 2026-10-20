import readline from "node:readline";

export async function performSearch(query) {
  const trimmed = typeof query === "string" ? query.trim() : "";
  if (!trimmed) {
    throw new Error("Search query must be a non-empty string.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY environment variable. Please configure GEMINI_API_KEY in your MCP client settings."
    );
  }

  const rawBaseUrl =
    process.env.GEMINI_BASE_URL ||
    process.env.GEMINI_PROXY_URL ||
    "https://generativelanguage.googleapis.com/v1beta";
  const baseUrl = rawBaseUrl.replace(/\/+$/, "");

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const timeoutMs = parseInt(process.env.GEMINI_TIMEOUT_MS || "35000", 10);

  const res = await fetch(`${baseUrl}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      contents: [{ parts: [{ text: trimmed }] }],
      tools: [{ googleSearch: {} }],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];

  // Extract text while ignoring internal model thoughts
  const parts = candidate?.content?.parts || [];
  const textParts = parts
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text);
  const answer =
    textParts.join("\n\n") || parts[0]?.text || "No response generated.";

  // Deduplicate sources by URI
  const chunks = candidate?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();
  const sources = [];

  for (const c of chunks) {
    const uri = c.web?.uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      const title = (c.web?.title || uri).trim();
      sources.push(`• [${title}](${uri})`);
    }
  }

  let output = answer;
  if (sources.length > 0) {
    output += "\n\n### Sources:\n" + sources.join("\n");
  }
  return output;
}

function send(data) {
  process.stdout.write(JSON.stringify(data) + "\n");
}

export function startServer() {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  let activeRequests = 0;
  let isClosed = false;

  function checkExit() {
    if (isClosed && activeRequests === 0) {
      process.exit(0);
    }
  }

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    activeRequests++;
    try {
      let msg;
      try {
        msg = JSON.parse(trimmed);
      } catch {
        send({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error: Invalid JSON" },
        });
        return;
      }

      const { id, method, params } = msg;

      if (method === "initialize") {
        send({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "gemini-search-mcp", version: "1.0.0" },
          },
        });
      } else if (method === "notifications/initialized") {
        // Protocol notification - no response required
      } else if (method === "ping") {
        send({
          jsonrpc: "2.0",
          id,
          result: {},
        });
      } else if (method === "tools/list") {
        send({
          jsonrpc: "2.0",
          id,
          result: {
            tools: [
              {
                name: "gemini_search",
                description:
                  "Search the live web using Google Search grounding via Gemini. Returns current real-time facts, documentation, news, and verified sources.",
                inputSchema: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description: "The search query or question to research on Google.",
                    },
                  },
                  required: ["query"],
                },
              },
            ],
          },
        });
      } else if (method === "tools/call") {
        if (params?.name === "gemini_search") {
          const query = params.arguments?.query;
          if (typeof query !== "string" || !query.trim()) {
            send({
              jsonrpc: "2.0",
              id,
              result: {
                isError: true,
                content: [
                  {
                    type: "text",
                    text: "Error: Missing or invalid 'query' argument. A non-empty string is required.",
                  },
                ],
              },
            });
            return;
          }

          try {
            const content = await performSearch(query);
            send({
              jsonrpc: "2.0",
              id,
              result: {
                content: [{ type: "text", text: content }],
              },
            });
          } catch (err) {
            send({
              jsonrpc: "2.0",
              id,
              result: {
                isError: true,
                content: [{ type: "text", text: `Search failed: ${err.message}` }],
              },
            });
          }
        } else {
          send({
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Tool not found: ${params?.name}` },
          });
        }
      } else if (id !== undefined) {
        send({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not supported: ${method}` },
        });
      }
    } finally {
      activeRequests--;
      checkExit();
    }
  });

  rl.on("close", () => {
    isClosed = true;
    checkExit();
  });

  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));
}
