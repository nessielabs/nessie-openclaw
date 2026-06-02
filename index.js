import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Type } from "@sinclair/typebox";

const PLUGIN_ID = "nessie-openclaw";
const PROVIDER_ID = "nessie";
const DEFAULT_MCP_ENDPOINT = "https://mcp.nessielabs.com/mcp";

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
    throw new Error("Nessie API key is not configured. Run `openclaw models auth login --provider nessie`, set NESSIE_API_KEY, or configure plugins.entries.nessie-openclaw.config.apiKey.");
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

const plugin = {
  id: PLUGIN_ID,
  name: "Nessie",
  description: "Search, read, and write Nessie context from OpenClaw through the hosted Nessie MCP server.",
  register(api) {
    api.logger?.info?.(`${PLUGIN_ID}: registering Nessie tools`);
    registerNessieProviderAuth(api);
    for (const definition of toolDefinitions) {
      registerNessieTool(api, definition);
    }
  },
};

export default plugin;
