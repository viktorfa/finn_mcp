#!/usr/bin/env node
import { parseArgs } from "node:util";
import { z } from "zod";
import { registerTools } from "./tools/index.js";

const tools = new Map();
registerTools({
  registerTool(name, config, handler) {
    tools.set(name, { ...config, handler });
  },
});

async function main() {
  const [command, ...argv] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    console.log(
      "Usage: finn <tool> [--parameter value ...]\n" +
        "       finn <tool> --json '{...}'\n" +
        "       finn <tool> --help\n\n" +
        "Tools:\n" +
        [...tools.keys()].map((name) => `  ${name}`).join("\n") +
        "\n\nResults are JSON. Errors go to stderr with exit status 1.",
    );
    return;
  }

  const tool = tools.get(command);
  if (!tool) throw new Error(`Unknown tool: ${command}. Run finn --help to list tools.`);
  const schema = z.strictObject(tool.inputSchema);
  const jsonSchema = z.toJSONSchema(schema);
  const options = { help: { type: "boolean", short: "h" }, json: { type: "string" } };
  for (const [name, property] of Object.entries(jsonSchema.properties)) {
    options[name] = {
      type: property.type === "boolean" ? "boolean" : "string",
      ...(property.type === "array" ? { multiple: true } : {}),
    };
  }
  const { values } = parseArgs({ args: argv, options });
  if (values.help) {
    console.log(`${tool.description}\n\nUsage: finn ${command} [options]\n`);
    for (const [name, property] of Object.entries(jsonSchema.properties)) {
      const required = jsonSchema.required?.includes(name) ? " (required)" : "";
      const repeat = property.type === "array" ? " (repeatable)" : "";
      const choices = property.enum ? ` Choices: ${property.enum.join(", ")}.` : "";
      console.log(`  --${name} <${property.type}>${required}${repeat}\n    ${property.description ?? ""}${choices}`);
    }
    console.log("\n  --json <object>  Supply parameters as JSON instead of flags.\n  -h, --help       Show help.");
    return;
  }

  const { help: _help, json, ...flags } = values;
  if (json !== undefined && Object.keys(flags).length) {
    throw new Error("Use either --json or parameter flags, not both.");
  }
  const args = schema.parse(json === undefined ? flags : JSON.parse(json));
  const result = await tool.handler(args);
  const output = result.content.map((item) => item.text).join("\n");
  if (result.isError) throw new Error(output);
  console.log(output);
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
