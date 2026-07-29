const PLUGIN_ID = "nessie-openclaw";
const PLUGIN_VERSION = "0.1.23";
const MCP_SERVER_NAME = "nessie";
const DEFAULT_MCP_ENDPOINT = "https://mcp.nessielabs.com/mcp";
const DEFAULT_OAUTH_SCOPE = "nessie:full offline_access";

function registerNessieCli(api) {
  if (typeof api.registerCli !== "function") {
    api.logger?.warn?.(`${PLUGIN_ID}: OpenClaw plugin API does not expose registerCli; Nessie setup commands were not registered.`);
    return false;
  }

  api.registerCli(async ({ program }) => {
    const command = program
      .command("nessie")
      .description("Manage the Nessie OpenClaw integration");

    command
      .command("init")
      .description("Configure OpenClaw to authenticate to Nessie with MCP OAuth")
      .option("--config <path>", "OpenClaw config path")
      .option("--json", "Print machine-readable JSON")
      .action(async (opts) => {
        await handleNessieInit(opts);
      });

    command
      .command("status")
      .description("Check whether Nessie MCP OAuth is configured")
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
  return true;
}

async function handleNessieInit(opts) {
  const configPath = await writeOpenClawConfig({
    configPath: opts.config,
  });
  const nextCommand = `openclaw mcp login ${MCP_SERVER_NAME}`;
  printResult(opts, {
    configured: true,
    connected: false,
    status: "authorization_required",
    message: `Nessie OAuth is configured. Run \`${nextCommand}\` to authorize OpenClaw.`,
    nextCommand,
    configPath,
  });
}

async function handleNessieStatus(opts) {
  const {
    config,
    configPath,
  } = await readOpenClawConfig(opts.config);
  const server = config?.mcp?.servers?.[MCP_SERVER_NAME];

  if (!isNessieOAuthConfig(server)) {
    const nextCommand = `openclaw nessie init`;
    printResult(opts, {
      configured: false,
      connected: false,
      status: "not_configured",
      message: `Nessie OAuth is not configured. Run \`${nextCommand}\`.`,
      nextCommand,
      configPath,
    });
    return;
  }

  const nextCommand = `openclaw mcp status --verbose`;
  printResult(opts, {
    configured: true,
    status: "oauth_configured",
    message: `Nessie OAuth is configured. Run \`${nextCommand}\` to check authorization.`,
    nextCommand,
    configPath,
  });
}

function isNessieOAuthConfig(server) {
  return Boolean(
    server
      && typeof server === "object"
      && !Array.isArray(server)
      && server.transport === "streamable-http"
      && server.url === DEFAULT_MCP_ENDPOINT
      && server.auth === "oauth"
      && server.oauth?.scope === DEFAULT_OAUTH_SCOPE,
  );
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

async function writeOpenClawConfig({ configPath }) {
  if (!configPath) {
    return mutateActiveOpenClawConfig();
  }

  const { dirname } = await import("node:path");
  const fs = await import("node:fs/promises");
  const dir = dirname(configPath);
  const existing = await readJsonFile(configPath);
  const next = {
    ...(existing && typeof existing === "object" ? existing : {}),
  };
  applyNessieConfig(next);

  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const tmp = `${configPath}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tmp, configPath);
  await fs.chmod(configPath, 0o600).catch(() => {});
  return configPath;
}

function applyNessieConfig(next) {
  const existingPluginEntry = next.plugins?.entries?.[PLUGIN_ID];
  const {
    config: _removedPluginConfig,
    ...preservedPluginEntry
  } = existingPluginEntry && typeof existingPluginEntry === "object"
    ? existingPluginEntry
    : {};

  next.plugins = {
    ...(next.plugins && typeof next.plugins === "object" ? next.plugins : {}),
    entries: {
      ...(next.plugins?.entries && typeof next.plugins.entries === "object" ? next.plugins.entries : {}),
      [PLUGIN_ID]: {
        ...preservedPluginEntry,
        enabled: true,
      },
    },
  };

  next.mcp = {
    ...(next.mcp && typeof next.mcp === "object" ? next.mcp : {}),
    servers: {
      ...(next.mcp?.servers && typeof next.mcp.servers === "object" ? next.mcp.servers : {}),
      [MCP_SERVER_NAME]: buildNessieMcpServerConfig(
        next.mcp?.servers?.[MCP_SERVER_NAME],
      ),
    },
  };
}

async function mutateActiveOpenClawConfig() {
  const fs = await import("node:fs/promises");
  const { mutateConfigFile } = await import("openclaw/plugin-sdk/config-mutation");
  const result = await mutateConfigFile({
    base: "source",
    mutate(next) {
      applyNessieConfig(next);
    },
  });
  await fs.chmod(result.path, 0o600).catch(() => {});
  return result.path;
}

async function readOpenClawConfig(configPath) {
  if (configPath) {
    return {
      config: await readJsonFile(configPath),
      configPath,
    };
  }

  const { readConfigFileSnapshotForWrite } = await import("openclaw/plugin-sdk/config-mutation");
  const { snapshot } = await readConfigFileSnapshotForWrite();
  return {
    config: snapshot.sourceConfig,
    configPath: snapshot.path,
  };
}

function buildNessieMcpServerConfig(existing) {
  const existingServer = existing && typeof existing === "object" && !Array.isArray(existing)
    ? existing
    : {};
  const existingHeaders = existingServer.headers && typeof existingServer.headers === "object" && !Array.isArray(existingServer.headers)
    ? existingServer.headers
    : {};
  const preservedHeaders = Object.fromEntries(
    Object.entries(existingHeaders).filter(([key]) => key.toLowerCase() !== "authorization"),
  );
  const {
    headers: _removedHeaders,
    oauth: existingOAuth,
    ...preservedServer
  } = existingServer;
  const next = {
    ...preservedServer,
    transport: "streamable-http",
    url: DEFAULT_MCP_ENDPOINT,
    auth: "oauth",
    oauth: {
      ...(existingOAuth && typeof existingOAuth === "object" && !Array.isArray(existingOAuth)
        ? existingOAuth
        : {}),
      scope: DEFAULT_OAUTH_SCOPE,
    },
  };
  if (Object.keys(preservedHeaders).length > 0) {
    next.headers = preservedHeaders;
  }
  return next;
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
  description: "Configure OpenClaw to use the hosted Nessie MCP server with OAuth.",
  register(api) {
    if (registerNessieCli(api)) {
      api.logger?.info?.(`${PLUGIN_ID}: registered Nessie setup CLI`);
    }
  },
};

export default plugin;
