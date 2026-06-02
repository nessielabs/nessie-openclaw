import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const PLUGIN_ID = "nessie-openclaw";
const MCP_SERVER_NAME = "nessie";
const DEFAULT_MCP_ENDPOINT = "https://mcp.nessielabs.com/mcp";
const DEFAULT_SETUP_BASE_URL = "https://mcp.nessielabs.com";
const REQUEST_TIMEOUT_MS = 20_000;

function registerNessieCli(api) {
  if (typeof api.registerCli !== "function") return;

  api.registerCli(async ({ program }) => {
    const command = program
      .command("nessie")
      .description("Manage the Nessie OpenClaw integration");

    command
      .command("init")
      .description("Connect OpenClaw to Nessie with email OTP or a Nessie API key")
      .option("--email <email>", "Nessie account email for OTP setup")
      .option("--code <code>", "6-digit OTP code sent by Nessie")
      .option("--api-key <key>", "Nessie API key created in the Nessie app")
      .option("--endpoint <url>", "Nessie setup API base URL", DEFAULT_SETUP_BASE_URL)
      .option("--mcp-endpoint <url>", "Nessie MCP endpoint", DEFAULT_MCP_ENDPOINT)
      .option("--config <path>", "OpenClaw config path")
      .option("--json", "Print machine-readable JSON")
      .action(async (opts) => {
        await handleNessieInit(opts);
      });

    command
      .command("status")
      .description("Check whether the Nessie OpenClaw integration is connected")
      .option("--mcp-endpoint <url>", "Nessie MCP endpoint override")
      .option("--config <path>", "OpenClaw config path")
      .option("--json", "Print machine-readable JSON")
      .action(async (opts) => {
        await handleNessieStatus(opts);
      });
  }, {
    commands: ["nessie"],
    descriptors: [{
      name: "nessie",
      description: "Manage the Nessie OpenClaw integration",
      hasSubcommands: true,
    }],
  });
}

async function handleNessieInit(opts) {
  const apiKey = normalizeApiKey(opts.apiKey);
  if (apiKey) {
    const validation = validateNessieApiKey(apiKey);
    if (validation) {
      throw new Error(validation);
    }
    const configPath = await writeOpenClawConfig({
      apiKey,
      configPath: opts.config,
      mcpEndpoint: opts.mcpEndpoint,
    });
    printResult(opts, {
      status: "connected",
      message: "Connected to Nessie.",
      configPath,
    });
    return;
  }

  const email = normalizeEmail(opts.email);
  const code = normalizeOtpCode(opts.code);
  if (!email) {
    throw new Error("Run `openclaw nessie init --email you@example.com`, or pass `--api-key sk_nes_v1_...`.");
  }

  const baseUrl = resolveSetupBaseUrl(opts.endpoint);
  if (!code) {
    await postSetupJson(`${baseUrl}/agent/openclaw/otp/start`, {
      email,
      client: "openclaw",
    });
    printResult(opts, {
      status: "otp_sent",
      message: "Check your email for a 6-digit code, then run `openclaw nessie init --email <email> --code <code>`.",
      email,
    });
    return;
  }

  const response = await postSetupJson(`${baseUrl}/agent/openclaw/otp/verify`, {
    email,
    code,
    client: "openclaw",
  });
  const issuedApiKey = normalizeApiKey(response.api_key ?? response.apiKey ?? response.key);
  const validation = validateNessieApiKey(issuedApiKey);
  if (validation) {
    throw new Error(`Nessie OTP verification did not return a valid API key: ${validation}`);
  }

  const configPath = await writeOpenClawConfig({
    apiKey: issuedApiKey,
    configPath: opts.config,
    mcpEndpoint: opts.mcpEndpoint,
  });
  printResult(opts, {
    status: "connected",
    message: "Connected to Nessie.",
    configPath,
  });
}

async function handleNessieStatus(opts) {
  const configPath = await resolveOpenClawConfigPath(opts.config);
  const config = await readJsonFile(configPath);
  const server = config?.mcp?.servers?.[MCP_SERVER_NAME];
  const apiKey = resolveApiKeyFromMcpServer(server) || process.env.NESSIE_API_KEY || "";
  const endpoint = normalizeEndpoint(opts.mcpEndpoint || server?.url || DEFAULT_MCP_ENDPOINT);

  if (!apiKey) {
    printResult(opts, {
      connected: false,
      status: "missing_api_key",
      message: "Nessie is not connected. Run `openclaw nessie init --email you@example.com` or `openclaw nessie init --api-key sk_nes_v1_...`.",
      configPath,
    });
    return;
  }

  const validation = validateNessieApiKey(apiKey);
  if (validation) {
    printResult(opts, {
      connected: false,
      status: "invalid_api_key",
      message: validation,
      configPath,
    });
    return;
  }

  try {
    const tools = await listHostedMcpTools({ endpoint, apiKey });
    printResult(opts, {
      connected: true,
      status: "connected",
      message: `Connected to Nessie (${tools.length} MCP tools available).`,
      toolCount: tools.length,
      configPath,
    });
  } catch (err) {
    printResult(opts, {
      connected: false,
      status: "connection_failed",
      message: err instanceof Error ? err.message : String(err),
      configPath,
    });
  }
}

function printResult(opts, result) {
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(result.message);
  if (result.configPath) {
    console.log(`OpenClaw config: ${result.configPath}`);
  }
}

async function listHostedMcpTools({ endpoint, apiKey }) {
  return withTimeout(async (signal) => {
    const client = new Client(
      { name: PLUGIN_ID, version: "0.1.0" },
      { capabilities: {} },
    );
    const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
      requestInit: {
        signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    });

    try {
      await client.connect(transport);
      const result = await client.listTools();
      return Array.isArray(result?.tools) ? result.tools : [];
    } finally {
      await client.close().catch(() => {});
    }
  }, REQUEST_TIMEOUT_MS, "Nessie MCP status check timed out.");
}

async function withTimeout(fn, timeoutMs, message) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(message);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeOtpCode(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, "") : "";
}

function normalizeApiKey(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateNessieApiKey(value) {
  const apiKey = normalizeApiKey(value);
  if (!apiKey) return "Enter a Nessie API key.";
  if (!apiKey.startsWith("sk_nes_v1_")) return "Nessie API keys start with sk_nes_v1_.";
  return undefined;
}

function resolveSetupBaseUrl(value) {
  const raw = normalizeEndpoint(value || process.env.NESSIE_SETUP_ENDPOINT || DEFAULT_SETUP_BASE_URL);
  return raw.endsWith("/mcp") ? raw.slice(0, -4) : raw;
}

function normalizeEndpoint(value) {
  return String(value || DEFAULT_MCP_ENDPOINT).trim().replace(/\/+$/, "");
}

async function postSetupJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = parseJson(text);
  if (!response.ok) {
    const message = data?.error_description || data?.message || data?.error || text || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data ?? {};
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function resolveApiKeyFromMcpServer(server) {
  const authHeader = server?.headers?.Authorization || server?.headers?.authorization;
  if (typeof authHeader !== "string") return "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) return "";
  try {
    return resolveEnvRefs(match[1].trim());
  } catch {
    return "";
  }
}

function resolveEnvRefs(value) {
  if (typeof value !== "string") return value;
  return value.replace(/\$\{([^}]+)\}/g, (_match, name) => {
    const envValue = process.env[name];
    if (!envValue) {
      throw new Error(`Environment variable ${name} is not set.`);
    }
    return envValue;
  });
}

async function writeOpenClawConfig({ apiKey, configPath, mcpEndpoint }) {
  const resolvedPath = await resolveOpenClawConfigPath(configPath);
  const { dirname } = await import("node:path");
  const fs = await import("node:fs/promises");
  const dir = dirname(resolvedPath);
  const existing = await readJsonFile(resolvedPath);
  const next = {
    ...(existing && typeof existing === "object" ? existing : {}),
  };

  next.plugins = {
    ...(next.plugins && typeof next.plugins === "object" ? next.plugins : {}),
    entries: {
      ...(next.plugins?.entries && typeof next.plugins.entries === "object" ? next.plugins.entries : {}),
      [PLUGIN_ID]: {
        ...(next.plugins?.entries?.[PLUGIN_ID] && typeof next.plugins.entries[PLUGIN_ID] === "object" ? next.plugins.entries[PLUGIN_ID] : {}),
        enabled: true,
        config: {
          ...(next.plugins?.entries?.[PLUGIN_ID]?.config && typeof next.plugins.entries[PLUGIN_ID].config === "object" ? next.plugins.entries[PLUGIN_ID].config : {}),
          endpoint: normalizeEndpoint(mcpEndpoint || DEFAULT_MCP_ENDPOINT),
        },
      },
    },
  };

  next.mcp = {
    ...(next.mcp && typeof next.mcp === "object" ? next.mcp : {}),
    servers: {
      ...(next.mcp?.servers && typeof next.mcp.servers === "object" ? next.mcp.servers : {}),
      [MCP_SERVER_NAME]: buildNessieMcpServerConfig({
        apiKey,
        endpoint: mcpEndpoint,
      }),
    },
  };

  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.chmod(dir, 0o700).catch(() => {});
  const tmp = `${resolvedPath}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tmp, resolvedPath);
  await fs.chmod(resolvedPath, 0o600).catch(() => {});
  return resolvedPath;
}

function buildNessieMcpServerConfig({ apiKey, endpoint }) {
  return {
    transport: "streamable-http",
    url: normalizeEndpoint(endpoint || DEFAULT_MCP_ENDPOINT),
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  };
}

async function resolveOpenClawConfigPath(value) {
  if (value) return value;
  if (process.env.OPENCLAW_CONFIG_PATH) return process.env.OPENCLAW_CONFIG_PATH;
  const { join } = await import("node:path");
  const { homedir } = await import("node:os");
  return join(homedir(), ".openclaw", "openclaw.json");
}

async function readJsonFile(filePath) {
  const fs = await import("node:fs/promises");
  try {
    const text = await fs.readFile(filePath, "utf8");
    if (!text.trim()) return {};
    return JSON.parse(text);
  } catch (err) {
    if (err && typeof err === "object" && err.code === "ENOENT") return {};
    if (err instanceof SyntaxError) {
      throw new Error(`OpenClaw config is not valid JSON: ${filePath}`);
    }
    throw err;
  }
}

const plugin = {
  id: PLUGIN_ID,
  name: "Nessie",
  description: "Configure OpenClaw to use the hosted Nessie MCP server.",
  register(api) {
    api.logger?.info?.(`${PLUGIN_ID}: registering Nessie setup CLI`);
    registerNessieCli(api);
  },
};

export default plugin;
