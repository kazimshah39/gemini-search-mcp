# gemini-search-mcp

A lightweight, zero-dependency [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides real-time web search with Google Search grounding powered by Google Gemini models.

Give your AI coding assistants (Claude Desktop, Cursor, Antigravity, OpenCode, Zed, Cline) real-time access to the live web, current documentation, APIs, and news with verified source citations.

## Features

- ⚡ **Zero External Dependencies**: Pure Node.js ESM. Instant `npx` downloads and cold starts without bundle bloat.
- 🔍 **Google Search Grounding**: Leverages Google's native grounding tools for high accuracy, freshness, and relevance.
- 📚 **Clean Markdown Citations**: Automatically extracts answers and appends deduplicated markdown source links.
- 🧠 **Thought-Filtering**: Automatically filters internal model reasoning tokens to keep tool outputs compact and relevant.
- ⚙️ **Custom Proxy & Model Support**: Compatible with official Google Gemini API as well as custom endpoints (e.g. CLIProxyAPI, Open-WebUI, or local gateways).

---

## Quickstart

You don't need to install anything globally. Run directly via `npx`:

```bash
npx -y @kazimshah39/gemini-search-mcp
```

### Get an API Key

Get a Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

---

## Configuration

Add the server to your MCP client configuration file:

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "gemini-search": {
      "command": "npx",
      "args": ["-y", "@kazimshah39/gemini-search-mcp"],
      "env": {
        "GEMINI_API_KEY": "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

### Cursor

In `.cursor/mcp.json` or Cursor Settings -> Features -> MCP:

```json
{
  "mcpServers": {
    "gemini-search": {
      "command": "npx",
      "args": ["-y", "@kazimshah39/gemini-search-mcp"],
      "env": {
        "GEMINI_API_KEY": "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

### Antigravity / OpenCode

In your workspace `.mcp.json`:

```json
{
  "mcpServers": {
    "gemini-search": {
      "command": "npx",
      "args": ["-y", "@kazimshah39/gemini-search-mcp"],
      "env": {
        "GEMINI_API_KEY": "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** | `undefined` | Your Google Gemini API key or proxy authorization key. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | The Gemini model to use for grounded searches (e.g., `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-3.8-flash`). |
| `GEMINI_BASE_URL` | No | `https://generativelanguage.googleapis.com/v1beta` | Custom base endpoint if using a custom gateway or reverse proxy. |
| `GEMINI_PROXY_URL` | No | `undefined` | Alias for `GEMINI_BASE_URL` (e.g. `http://127.0.0.1:8317/v1beta`). |
| `GEMINI_TIMEOUT_MS`| No | `35000` | Request timeout in milliseconds (default 35 seconds). |

### Example with Local Proxy / Custom Gateway

If you route requests through a local proxy (such as CLIProxyAPI):

```json
{
  "mcpServers": {
    "gemini-search": {
      "command": "npx",
      "args": ["-y", "@kazimshah39/gemini-search-mcp"],
      "env": {
        "GEMINI_API_KEY": "YOUR_PROXY_KEY",
        "GEMINI_PROXY_URL": "http://127.0.0.1:8317/v1beta",
        "GEMINI_MODEL": "gemini-3.8-flash"
      }
    }
  }
}
```

---

## Tool Reference

### `gemini_search`

Search the live web using Google Search grounding via Gemini. Returns current real-time facts, documentation, news, and verified sources.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The search query or question to research on Google."
    }
  },
  "required": ["query"]
}
```

---

## Local Development & Testing

Clone the repository and test locally:

```bash
git clone https://github.com/kazimshah39/gemini-search-mcp.git
cd gemini-search-mcp

# Test running directly
export GEMINI_API_KEY="your-key-here"
node ./bin/cli.js
```

You can test JSON-RPC communication by piping JSON:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node ./bin/cli.js
```

---

## License

[MIT](LICENSE) © Kazim Shah
