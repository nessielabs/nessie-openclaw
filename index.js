import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Type } from "@sinclair/typebox";

const PLUGIN_ID = "nessie-openclaw";
const PROVIDER_ID = "nessie";
const DEFAULT_MCP_ENDPOINT = "https://mcp.nessielabs.com/mcp";
const DEFAULT_SETUP_BASE_URL = "https://mcp.nessielabs.com";

const sourceTypeSchema = Type.Optional(Type.Union([
  Type.Literal("context"),
  Type.Literal("transcript"),
  Type.Literal("profile"),
  Type.Literal("obsidian"),
  Type.Literal("all"),
]));
const profileSectionSchema = Type.Optional(Type.Union([
  Type.Literal("contact"),
  Type.Literal("work"),
  Type.Literal("education"),
  Type.Literal("connections"),
  Type.Literal("biography"),
  Type.Literal("personality"),
  Type.Literal("communication"),
  Type.Literal("expertise"),
  Type.Literal("decisions"),
  Type.Literal("upcoming"),
  Type.Literal("projects"),
]));
const uuidSchema = (description) => Type.String({ description });

const toolDefinitions = [
  {
    name: "nessie_team_list",
    label: "Nessie Team List",
    description: "List teams and team-shared resources readable by the authenticated user.",
    parameters: Type.Object({}),
    summarize: () => "team listing",
  },
  {
    name: "nessie_integration_list",
    label: "Nessie Integration List",
    description: "List readable integration roots, including team-shared roots with team and owner provenance.",
    parameters: Type.Object({}),
    summarize: () => "integration listing",
  },
  {
    name: "nessie_list",
    label: "Nessie List Documents",
    description: "List documents in the user's Nessie knowledge base.",
    parameters: Type.Object({
      type: Type.Optional(Type.Union([
        Type.Literal("context"),
        Type.Literal("transcript"),
        Type.Literal("all"),
      ], { description: "Filter by document type. Default: all." })),
      limit: Type.Optional(Type.Number({ description: "Maximum documents to return. Default: 50." })),
    }),
    summarize: () => "document listing",
  },
  {
    name: "nessie_ls",
    label: "Nessie List Sources",
    description: "List available Nessie source worlds or traverse children of a source node.",
    parameters: Type.Object({
      parentId: Type.Optional(uuidSchema("Optional source node UUID to list children for.")),
      sourceType: sourceTypeSchema,
      limit: Type.Optional(Type.Number({ description: "Maximum roots or children to return. Default: 100." })),
    }),
    summarize: () => "source listing",
  },
  {
    name: "nessie_search",
    label: "Nessie Search",
    description: "Search the user's Nessie knowledge base.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query." }),
      type: sourceTypeSchema,
      limit: Type.Optional(Type.Number({ description: "Maximum matching documents. Default: 10." })),
      chunksPerDocument: Type.Optional(Type.Number({ description: "Maximum matching chunks per document. Default: 3." })),
      parentId: Type.Optional(uuidSchema("Optional source node UUID to scope search.")),
      kind: Type.Optional(Type.String({ description: "Optional exact searchable node kind." })),
      since: Type.Optional(Type.String({ description: "Optional ISO datetime lower bound." })),
      until: Type.Optional(Type.String({ description: "Optional ISO datetime upper bound." })),
      literal: Type.Optional(Type.Boolean({ description: "Use exact substring matching instead of hybrid search." })),
    }),
    summarize: () => "search",
  },
  {
    name: "nessie_read",
    label: "Nessie Read",
    description: "Read a Nessie document or source node by id.",
    parameters: Type.Object({
      id: uuidSchema("Document or source node UUID."),
      offset: Type.Optional(Type.Number({ description: "Chunk offset. Default: 0." })),
      limit: Type.Optional(Type.Number({ description: "Maximum chunks. Default: 25." })),
    }),
    summarize: () => "read",
  },
  {
    name: "nessie_resume",
    label: "Nessie Resume",
    description: "Resume or take over a prior AI session by id or search query.",
    parameters: Type.Object({
      id: Type.Optional(uuidSchema("Transcript, chat, or source node UUID to resume.")),
      query: Type.Optional(Type.String({ description: "Topic, title, error, branch, path, or other clue for finding candidate transcripts." })),
      beginLimit: Type.Optional(Type.Number({ description: "Number of beginning chunks/messages to read. Default: 5." })),
      tailLimit: Type.Optional(Type.Number({ description: "Number of recent tail chunks/messages to read. Default: 10." })),
      candidateLimit: Type.Optional(Type.Number({ description: "Maximum transcript candidates in query mode. Default: 10." })),
    }),
    summarize: () => "session resume",
  },
  {
    name: "nessie_who_am_i",
    label: "Nessie Who Am I",
    description: "Read generated Nessie profile sections about the user.",
    parameters: Type.Object({
      section: profileSectionSchema,
    }),
    summarize: () => "profile read",
  },
  {
    name: "nessie_check_in",
    label: "Nessie Check-In",
    description: "Load generated profile sections and recent Nessie activity at the start of a session.",
    parameters: Type.Object({
      recentLimit: Type.Optional(Type.Number({ description: "Maximum recent activity documents to return. Default: 10." })),
    }),
    summarize: () => "check-in",
  },
  {
    name: "nessie_folders",
    label: "Nessie Folders",
    description: "List Nessie folders, or inspect one folder's child folders and contexts by id.",
    parameters: Type.Object({
      id: Type.Optional(uuidSchema("Folder UUID to inspect.")),
      limit: Type.Optional(Type.Number({ description: "Maximum folders to return when listing. Default: 100." })),
    }),
    summarize: () => "folder listing",
  },
  {
    name: "nessie_create_context",
    label: "Nessie Create Context",
    description: "Create a new Nessie context document.",
    parameters: Type.Object({
      title: Type.String({ description: "Context title." }),
      markdown: Type.Optional(Type.String({ description: "Context body markdown." })),
      emoji: Type.Optional(Type.String({ description: "Optional emoji/icon." })),
      folderId: Type.Optional(uuidSchema("Optional folder UUID to place the context in.")),
      sources: Type.Optional(Type.Array(Type.String(), { description: "Optional source UUIDs used as provenance." })),
    }),
    summarize: () => "context creation",
  },
  {
    name: "nessie_edit_context",
    label: "Nessie Edit Context",
    description: "Edit a Nessie context by replacing exact text.",
    parameters: Type.Object({
      id: uuidSchema("Context UUID."),
      oldString: Type.String({ description: "Exact existing text to replace." }),
      newString: Type.String({ description: "Replacement text." }),
      replaceAll: Type.Optional(Type.Boolean({ description: "Replace every occurrence. Default: false." })),
    }),
    summarize: () => "context edit",
  },
  {
    name: "nessie_rename_context",
    label: "Nessie Rename Context",
    description: "Rename a Nessie context.",
    parameters: Type.Object({
      id: uuidSchema("Context UUID."),
      name: Type.String({ description: "New context title. Empty titles become Untitled." }),
    }),
    summarize: () => "context rename",
  },
  {
    name: "nessie_move_context",
    label: "Nessie Move Context",
    description: "Move a Nessie context into a folder or mark it unfiled.",
    parameters: Type.Object({
      id: uuidSchema("Context UUID."),
      folderId: Type.Optional(uuidSchema("Destination folder UUID.")),
      unfiled: Type.Optional(Type.Boolean({ description: "Set true to remove the context from any folder." })),
    }),
    summarize: () => "context move",
  },
  {
    name: "nessie_delete_context",
    label: "Nessie Delete Context",
    description: "Delete a Nessie context document.",
    parameters: Type.Object({
      id: uuidSchema("Context UUID."),
    }),
    summarize: () => "context deletion",
  },
  {
    name: "nessie_create_folder",
    label: "Nessie Create Folder",
    description: "Create a Nessie folder for organizing contexts.",
    parameters: Type.Object({
      name: Type.String({ description: "Folder name." }),
      emoji: Type.Optional(Type.String({ description: "Optional emoji/icon." })),
      parentId: Type.Optional(uuidSchema("Optional parent folder UUID.")),
    }),
    summarize: () => "folder creation",
  },
  {
    name: "nessie_rename_folder",
    label: "Nessie Rename Folder",
    description: "Rename a Nessie folder and optionally set or clear its emoji.",
    parameters: Type.Object({
      id: uuidSchema("Folder UUID."),
      name: Type.String({ description: "New folder name." }),
      emoji: Type.Optional(Type.Union([
        Type.String({ description: "Optional emoji/icon." }),
        Type.Null({ description: "Pass null to clear the emoji." }),
      ])),
    }),
    summarize: () => "folder rename",
  },
  {
    name: "nessie_delete_folder",
    label: "Nessie Delete Folder",
    description: "Delete an empty Nessie folder.",
    parameters: Type.Object({
      id: uuidSchema("Folder UUID."),
    }),
    summarize: () => "folder deletion",
  },
];

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

function pluginConfig(rawConfig) {
  const cfg = rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig)
    ? rawConfig
    : {};
  const endpoint = (resolveEnvRefs(cfg.endpoint) || process.env.NESSIE_MCP_ENDPOINT || process.env.NESSIE_ENDPOINT || DEFAULT_MCP_ENDPOINT)
    .replace(/\/+$/, "");
  return {
    apiKey: resolveEnvRefs(cfg.apiKey) || "",
    endpoint,
  };
}

async function resolveNessieApiKey(api, config) {
  if (config.apiKey) return config.apiKey;

  const resolved = await api.runtime?.modelAuth?.resolveApiKeyForProvider?.({
    provider: PROVIDER_ID,
    cfg: api.config,
  }).catch(() => null);
  if (typeof resolved?.apiKey === "string" && resolved.apiKey.trim()) {
    return resolved.apiKey.trim();
  }

  if (process.env.NESSIE_API_KEY) return process.env.NESSIE_API_KEY;

  return "";
}

async function callNessieTool(api, config, toolName, args = {}) {
  const apiKey = await resolveNessieApiKey(api, config);
  if (!apiKey) {
    throw new Error("Nessie API key is not configured. Run `openclaw nessie init --email <email>` or `openclaw nessie init --api-key sk_nes_v1_...`, set NESSIE_API_KEY, or configure plugins.entries.nessie-openclaw.config.apiKey.");
  }

  const client = new Client(
    { name: PLUGIN_ID, version: "0.1.0" },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(new URL(config.endpoint), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  });

  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: toolName,
      arguments: args ?? {},
    });
    if (result?.isError) {
      throw new Error(extractMcpText(result) || `MCP tool ${toolName} returned an error.`);
    }
    return result;
  } finally {
    await client.close().catch(() => {});
  }
}

function extractMcpText(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.content)) return "";
  return value.content
    .filter((part) => part && part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

function toolResult(value) {
  if (value && typeof value === "object" && Array.isArray(value.content)) {
    return {
      content: value.content,
      details: value,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
    details: value,
  };
}

function errorResult(action, err) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [
      {
        type: "text",
        text: `Nessie ${action} failed: ${message}`,
      },
    ],
    details: {
      error: message,
    },
  };
}

function registerNessieTool(api, definition) {
  api.registerTool(
    {
      name: definition.name,
      label: definition.label,
      description: definition.description,
      parameters: definition.parameters,
      async execute(_toolCallId, params) {
        const config = pluginConfig(api.pluginConfig);
        try {
          const result = await callNessieTool(api, config, definition.name, params ?? {});
          return toolResult(result);
        } catch (err) {
          api.logger?.warn?.(`${PLUGIN_ID}: ${definition.name} failed: ${err instanceof Error ? err.message : String(err)}`);
          return errorResult(definition.summarize(params ?? {}), err);
        }
      },
    },
    { name: definition.name },
  );
}

function buildPluginConfigPatch(config) {
  return {
    plugins: {
      ...config.plugins,
      entries: {
        ...config.plugins?.entries,
        [PLUGIN_ID]: {
          ...config.plugins?.entries?.[PLUGIN_ID],
          enabled: true,
          config: {
            ...config.plugins?.entries?.[PLUGIN_ID]?.config,
            endpoint: config.plugins?.entries?.[PLUGIN_ID]?.config?.endpoint || DEFAULT_MCP_ENDPOINT,
          },
        },
      },
    },
  };
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

function createApiKeyCredential(apiKey) {
  return {
    type: "api_key",
    provider: PROVIDER_ID,
    key: apiKey,
    metadata: {
      source: PLUGIN_ID,
    },
  };
}

function registerNessieProviderAuth(api) {
  if (typeof api.registerProvider !== "function") return;

  api.registerProvider({
    id: PROVIDER_ID,
    pluginId: PLUGIN_ID,
    label: "Nessie",
    docsPath: "/plugins/nessie-openclaw",
    envVars: ["NESSIE_API_KEY"],
    auth: [
      {
        id: "api-key",
        label: "Nessie API key",
        hint: "Create an agent API key in Nessie Settings > API keys.",
        kind: "api_key",
        async run(ctx) {
          const flagValue = normalizeApiKey(ctx.opts?.nessieApiKey ?? ctx.opts?.token);
          const apiKey = flagValue || await ctx.prompter.text({
            message: "Enter your Nessie API key:",
            placeholder: "sk_nes_v1_...",
            sensitive: true,
            validate: validateNessieApiKey,
          });
          const normalized = normalizeApiKey(apiKey);
          const validation = validateNessieApiKey(normalized);
          if (validation) throw new Error(validation);

          return {
            profiles: [{
              profileId: "nessie:default",
              credential: createApiKeyCredential(normalized),
            }],
            configPatch: buildPluginConfigPatch(ctx.config),
            notes: ["Nessie OpenClaw plugin enabled. Nessie tool calls will use the stored OpenClaw auth profile."],
          };
        },
      },
    ],
    staticCatalog: {
      async run() {
        return null;
      },
    },
    catalog: {
      async run() {
        return null;
      },
    },
  });
}

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
      .option("--endpoint <url>", "Nessie setup API base URL", DEFAULT_SETUP_BASE_URL)
      .option("--config <path>", "OpenClaw config path")
      .option("--json", "Print machine-readable JSON")
      .action(async (opts) => {
        await handleNessieStatus(opts);
      });

    command
      .command("setup-prompt")
      .description("Print the agent-facing Nessie setup prompt")
      .action(() => {
        console.log(buildSetupPrompt());
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
    printInitResult(opts, {
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
    printInitResult(opts, {
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
    throw new Error("Nessie OTP verification did not return a valid API key.");
  }

  const configPath = await writeOpenClawConfig({
    apiKey: issuedApiKey,
    configPath: opts.config,
    mcpEndpoint: opts.mcpEndpoint,
  });
  printInitResult(opts, {
    status: "connected",
    message: "Connected to Nessie.",
    configPath,
  });
}

async function handleNessieStatus(opts) {
  const configPath = await resolveOpenClawConfigPath(opts.config);
  const config = await readJsonFile(configPath);
  const configuredKey = normalizeApiKey(config?.plugins?.entries?.[PLUGIN_ID]?.config?.apiKey);
  const apiKey = configuredKey ? resolveEnvRefs(configuredKey) : process.env.NESSIE_API_KEY;
  if (!apiKey) {
    printStatusResult(opts, {
      connected: false,
      status: "missing_api_key",
      message: "Nessie is not connected. Run `openclaw nessie init --email you@example.com` or `openclaw nessie init --api-key sk_nes_v1_...`.",
      configPath,
    });
    return;
  }

  const validation = validateNessieApiKey(apiKey);
  if (validation) {
    printStatusResult(opts, {
      connected: false,
      status: "invalid_api_key",
      message: validation,
      configPath,
    });
    return;
  }

  try {
    await validateNessieConnection(apiKey, opts.endpoint);
    printStatusResult(opts, {
      connected: true,
      status: "connected",
      message: "Connected to Nessie.",
      configPath,
    });
  } catch (err) {
    printStatusResult(opts, {
      connected: false,
      status: "connection_failed",
      message: err instanceof Error ? err.message : String(err),
      configPath,
    });
  }
}

function printInitResult(opts, result) {
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(result.message);
  if (result.configPath) {
    console.log(`OpenClaw config updated: ${result.configPath}`);
  }
}

function printStatusResult(opts, result) {
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(result.message);
  if (result.configPath) {
    console.log(`OpenClaw config: ${result.configPath}`);
  }
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeOtpCode(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, "") : "";
}

function resolveSetupBaseUrl(value) {
  const raw = (value || process.env.NESSIE_SETUP_ENDPOINT || DEFAULT_SETUP_BASE_URL).replace(/\/+$/, "");
  return raw.endsWith("/mcp") ? raw.slice(0, -4) : raw;
}

async function postSetupJson(url, body, apiKey) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
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

async function validateNessieConnection(apiKey, endpoint) {
  const baseUrl = resolveSetupBaseUrl(endpoint);
  await postSetupJson(`${baseUrl}/agent/tools/ls`, { limit: 1 }, apiKey);
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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
          apiKey,
          endpoint: mcpEndpoint || DEFAULT_MCP_ENDPOINT,
        },
      },
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

function buildSetupPrompt() {
  return `Prompt for Agent
Set up the Nessie OpenClaw plugin.

Install & Configure

Run: openclaw plugins install @nessielabs/nessie-openclaw

Ask the user: "What's your email address? I'll send you a verification code to connect your Nessie account."
Wait for their email, then run:
openclaw nessie init --email EMAIL_PROVIDED_BY_USER

Ask the user: "Check your email for a 6-digit code and paste it here."
Wait for the code, then run:
openclaw nessie init --email THEIR_EMAIL --code CODE_PROVIDED_BY_USER

Run: openclaw nessie status
Confirm it shows "Connected to Nessie."

Test the connection by asking Nessie for a check-in. If the check-in returns profile sections or recent activity, report: "Nessie is connected."

End of agent prompt`;
}

const plugin = {
  id: PLUGIN_ID,
  name: "Nessie",
  description: "Search, read, and write Nessie context from OpenClaw through the hosted Nessie MCP server.",
  register(api) {
    api.logger?.info?.(`${PLUGIN_ID}: registering Nessie tools`);
    registerNessieProviderAuth(api);
    registerNessieCli(api);
    for (const definition of toolDefinitions) {
      registerNessieTool(api, definition);
    }
  },
};

export default plugin;
