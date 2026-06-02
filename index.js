import { Type } from "@sinclair/typebox";

const PLUGIN_ID = "nessie-openclaw";
const DEFAULT_ENDPOINT = "https://mcp.nessielabs.com";

const sourceTypeSchema = Type.Optional(Type.Union([
  Type.Literal("context"),
  Type.Literal("transcript"),
  Type.Literal("profile"),
  Type.Literal("obsidian"),
  Type.Literal("all"),
]));

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
  const apiKey = resolveEnvRefs(cfg.apiKey) || process.env.NESSIE_API_KEY || "";
  const endpoint = (resolveEnvRefs(cfg.endpoint) || process.env.NESSIE_ENDPOINT || DEFAULT_ENDPOINT)
    .replace(/\/+$/, "");
  return { apiKey, endpoint };
}

async function callNessie(config, path, body = {}) {
  if (!config.apiKey) {
    throw new Error("Nessie API key is not configured. Set NESSIE_API_KEY or plugins.entries.nessie-openclaw.config.apiKey.");
  }

  const response = await fetch(`${config.endpoint}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = parseJson(text);

  if (!response.ok) {
    const error = data && typeof data === "object"
      ? data.error_description || data.message || data.error
      : text;
    throw new Error(`Nessie request failed (${response.status}): ${error || "unknown error"}`);
  }

  return data ?? {};
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toolResult(value) {
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

function registerNessieTool(api, definition, route, summarize = (params) => params) {
  api.registerTool(
    {
      ...definition,
      async execute(_toolCallId, params) {
        const config = pluginConfig(api.pluginConfig);
        try {
          const result = await callNessie(config, route, params ?? {});
          return toolResult(result);
        } catch (err) {
          api.logger?.warn?.(`${PLUGIN_ID}: ${definition.name} failed: ${err instanceof Error ? err.message : String(err)}`);
          return errorResult(summarize(params ?? {}), err);
        }
      },
    },
    { name: definition.name },
  );
}

const plugin = {
  id: PLUGIN_ID,
  name: "Nessie",
  description: "Search and read Nessie context from OpenClaw.",
  register(api) {
    api.logger?.info?.(`${PLUGIN_ID}: registering Nessie tools`);

    api.registerTool(
      {
        name: "nessie_check_in",
        label: "Nessie Check-In",
        description: "Load high-level Nessie context at the start of a session. Uses profile and source overview data from Nessie.",
        parameters: Type.Object({
          recentLimit: Type.Optional(Type.Number({ description: "Reserved for future dedicated check-in support. Default: 10." })),
        }),
        async execute(_toolCallId) {
          const config = pluginConfig(api.pluginConfig);
          try {
            const [profile, sources] = await Promise.all([
              callNessie(config, "/agent/tools/ls", { sourceType: "profile", limit: 100 }),
              callNessie(config, "/agent/tools/ls", { sourceType: "all", limit: 50 }),
            ]);
            return toolResult({
              profile,
              sources,
              note: "Native OpenClaw check-in currently composes Nessie profile/source listing. Use search and read tools for deeper context.",
            });
          } catch (err) {
            api.logger?.warn?.(`${PLUGIN_ID}: nessie_check_in failed: ${err instanceof Error ? err.message : String(err)}`);
            return errorResult("check-in", err);
          }
        },
      },
      { name: "nessie_check_in" },
    );

    registerNessieTool(api, {
      name: "nessie_ls",
      label: "Nessie List Sources",
      description: "List available Nessie source worlds or traverse children of a source node.",
      parameters: Type.Object({
        parentId: Type.Optional(Type.String({ description: "Optional source node UUID to list children for." })),
        sourceType: sourceTypeSchema,
        limit: Type.Optional(Type.Number({ description: "Maximum sources to return. Default: 100." })),
      }),
    }, "/agent/tools/ls", () => "source listing");

    registerNessieTool(api, {
      name: "nessie_search",
      label: "Nessie Search",
      description: "Search the user's Nessie knowledge base.",
      parameters: Type.Object({
        query: Type.String({ description: "Search query." }),
        type: sourceTypeSchema,
        limit: Type.Optional(Type.Number({ description: "Maximum matching documents. Default: 10." })),
        chunksPerDocument: Type.Optional(Type.Number({ description: "Maximum matching chunks per document. Default: 3." })),
        parentId: Type.Optional(Type.String({ description: "Optional source node UUID to scope search." })),
        kind: Type.Optional(Type.String({ description: "Optional exact searchable node kind." })),
        since: Type.Optional(Type.String({ description: "Optional ISO datetime lower bound." })),
        until: Type.Optional(Type.String({ description: "Optional ISO datetime upper bound." })),
        literal: Type.Optional(Type.Boolean({ description: "Use exact substring matching instead of hybrid search." })),
      }),
    }, "/agent/tools/search", () => "search");

    registerNessieTool(api, {
      name: "nessie_read",
      label: "Nessie Read",
      description: "Read a Nessie document or source node by id.",
      parameters: Type.Object({
        id: Type.String({ description: "Document or source node UUID." }),
        offset: Type.Optional(Type.Number({ description: "Chunk offset. Default: 0." })),
        limit: Type.Optional(Type.Number({ description: "Maximum chunks. Default: 25." })),
      }),
    }, "/agent/tools/read", () => "read");

    registerNessieTool(api, {
      name: "nessie_create_context",
      label: "Nessie Create Context",
      description: "Create a new reusable Nessie context.",
      parameters: Type.Object({
        title: Type.String({ description: "Context title." }),
        markdown: Type.Optional(Type.String({ description: "Context body markdown." })),
        emoji: Type.Optional(Type.String({ description: "Optional emoji/icon." })),
        folderId: Type.Optional(Type.String({ description: "Optional destination folder UUID." })),
        sources: Type.Optional(Type.Array(Type.String(), { description: "Optional source UUIDs used as provenance." })),
      }),
    }, "/agent/tools/context/create", () => "context creation");

    registerNessieTool(api, {
      name: "nessie_edit_context",
      label: "Nessie Edit Context",
      description: "Edit a Nessie context by replacing exact text.",
      parameters: Type.Object({
        id: Type.String({ description: "Context UUID." }),
        oldString: Type.String({ description: "Exact existing text to replace." }),
        newString: Type.String({ description: "Replacement text." }),
        replaceAll: Type.Optional(Type.Boolean({ description: "Replace every occurrence. Default: false." })),
      }),
    }, "/agent/tools/context/edit", () => "context edit");
  },
};

export default plugin;
