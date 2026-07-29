import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import plugin from "../index.js";

class FakeCommand {
  constructor(name = "root") {
    this.name = name;
    this.children = new Map();
    this.optionFlags = [];
    this.handler = undefined;
  }

  command(spec) {
    const name = spec.trim().split(/\s+/)[0];
    const child = new FakeCommand(name);
    this.children.set(name, child);
    return child;
  }

  description() {
    return this;
  }

  option(flags) {
    this.optionFlags.push(flags);
    return this;
  }

  action(handler) {
    this.handler = handler;
    return this;
  }
}

async function loadCommands() {
  let registrar;
  plugin.register({
    registerCli(callback) {
      registrar = callback;
    },
    logger: {
      info() {},
      warn() {},
    },
  });
  assert.equal(typeof registrar, "function");
  const program = new FakeCommand();
  await registrar({ program });
  const nessie = program.children.get("nessie");
  assert.ok(nessie);
  return {
    init: nessie.children.get("init"),
    status: nessie.children.get("status"),
  };
}

async function captureJsonOutput(action) {
  const lines = [];
  const originalLog = console.log;
  console.log = (...args) => {
    lines.push(args.join(" "));
  };
  try {
    await action();
  } finally {
    console.log = originalLog;
  }
  assert.equal(lines.length, 1);
  return JSON.parse(lines[0]);
}

test("setup CLI exposes OAuth-only options", async () => {
  const { init, status } = await loadCommands();
  assert.ok(init);
  assert.ok(status);
  assert.deepEqual(init.optionFlags, [
    "--config <path>",
    "--json",
  ]);
  assert.deepEqual(status.optionFlags, [
    "--config <path>",
    "--json",
  ]);
});

test("init migrates legacy credential config to native MCP OAuth", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "nessie-openclaw-oauth-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const configPath = join(root, "openclaw.json");
  const legacySecret = "legacy-secret-that-must-be-removed";
  await writeFile(configPath, `${JSON.stringify({
    customTopLevel: { keep: true },
    plugins: {
      entries: {
        "other-plugin": { enabled: true },
        "nessie-openclaw": {
          enabled: false,
          config: { credential: legacySecret },
          keepMe: "yes",
        },
      },
    },
    mcp: {
      sessionIdleTtlMs: 1234,
      servers: {
        other: { command: "example" },
        nessie: {
          transport: "sse",
          url: "https://old.example.test/mcp",
          timeout: 17,
          headers: {
            authorization: `Bearer ${legacySecret}`,
            "X-Nessie-Test": "keep",
          },
          oauth: {
            redirectUrl: "http://127.0.0.1:3456/callback",
          },
        },
      },
    },
  }, null, 2)}\n`);

  const { init } = await loadCommands();
  const output = await captureJsonOutput(() => init.handler({
    config: configPath,
    json: true,
  }));
  const savedText = await readFile(configPath, "utf8");
  const saved = JSON.parse(savedText);

  assert.equal(output.status, "authorization_required");
  assert.equal(output.nextCommand, "openclaw mcp login nessie");
  assert.equal(output.configPath, configPath);
  assert.equal(savedText.includes(legacySecret), false);
  assert.deepEqual(saved.customTopLevel, { keep: true });
  assert.deepEqual(saved.plugins.entries["other-plugin"], { enabled: true });
  assert.deepEqual(saved.plugins.entries["nessie-openclaw"], {
    enabled: true,
    keepMe: "yes",
  });
  assert.equal(saved.mcp.sessionIdleTtlMs, 1234);
  assert.deepEqual(saved.mcp.servers.other, { command: "example" });
  assert.deepEqual(saved.mcp.servers.nessie, {
    transport: "streamable-http",
    url: "https://mcp.nessielabs.com/mcp",
    timeout: 17,
    auth: "oauth",
    oauth: {
      redirectUrl: "http://127.0.0.1:3456/callback",
      scope: "nessie:full offline_access",
    },
    headers: {
      "X-Nessie-Test": "keep",
    },
  });

  if (process.platform !== "win32") {
    const fileStat = await stat(configPath);
    assert.equal(fileStat.mode & 0o777, 0o600);
  }
});

test("init removes an empty legacy headers object", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "nessie-openclaw-headers-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const configPath = join(root, "openclaw.json");
  await writeFile(configPath, `${JSON.stringify({
    mcp: {
      servers: {
        nessie: {
          headers: {
            Authorization: "Bearer legacy",
          },
        },
      },
    },
  })}\n`);

  const { init } = await loadCommands();
  await captureJsonOutput(() => init.handler({
    config: configPath,
    json: true,
  }));
  const saved = JSON.parse(await readFile(configPath, "utf8"));

  assert.equal(Object.hasOwn(saved.mcp.servers.nessie, "headers"), false);
});

test("status reports configuration without claiming OAuth authorization", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "nessie-openclaw-status-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const configPath = join(root, "openclaw.json");
  const { init, status } = await loadCommands();

  const before = await captureJsonOutput(() => status.handler({
    config: configPath,
    json: true,
  }));
  assert.equal(before.status, "not_configured");
  assert.equal(before.nextCommand, "openclaw nessie init");

  await captureJsonOutput(() => init.handler({
    config: configPath,
    json: true,
  }));
  const after = await captureJsonOutput(() => status.handler({
    config: configPath,
    json: true,
  }));
  assert.equal(after.status, "oauth_configured");
  assert.equal(after.nextCommand, "openclaw mcp status --verbose");
  assert.equal(Object.hasOwn(after, "connected"), false);
});
