import type {
  N8nConnectionTarget,
  N8nNode,
  N8nWorkflow,
  WorkflowValidationResult,
} from "@/types/automation-workflow";
import {
  HIGH_RISK_NODE_TYPES,
  SUPPORTED_NODE_CATALOGUE,
  SUPPORTED_NODE_TYPES,
  TRIGGER_NODE_TYPES,
} from "@/lib/automation-builder/catalogue";
import { findAutomationSecrets } from "@/lib/automation-builder/security";

const UNSUPPORTED_EXPRESSION_PATTERNS = [
  /\{\{\s*\$(?:env|vars|secrets|credentials)\b/i,
  /\bprocess\.env\b/i,
  /\brequire\s*\(/i,
  /\b(?:eval|Function)\s*\(/,
  /\bchild_process\b/i,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectStrings(value: unknown, result: string[] = []): string[] {
  if (typeof value === "string") result.push(value);
  else if (Array.isArray(value))
    value.forEach((item) => collectStrings(item, result));
  else if (isRecord(value))
    Object.values(value).forEach((item) => collectStrings(item, result));
  return result;
}

function findAuthorizationFields(value: unknown, path = "workflow"): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) =>
      findAuthorizationFields(item, `${path}[${index}]`),
    );
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, item]) => {
    const current = `${path}.${key}`;
    const suspiciousKey = /authorization|api[_-]?key|access[_-]?token/i.test(key);
    const suspiciousValue =
      typeof item === "string" && /bearer\s+|basic\s+[A-Za-z0-9+/=]/i.test(item);
    return [
      ...(suspiciousKey || suspiciousValue ? [current] : []),
      ...findAuthorizationFields(item, current),
    ];
  });
}

function connectionTargets(
  workflow: N8nWorkflow,
): Array<{ source: string; target: N8nConnectionTarget }> {
  const result: Array<{ source: string; target: N8nConnectionTarget }> = [];
  for (const [source, groups] of Object.entries(workflow.connections || {})) {
    if (!isRecord(groups)) continue;
    for (const outputs of Object.values(groups)) {
      if (!Array.isArray(outputs)) continue;
      for (const output of outputs) {
        if (!Array.isArray(output)) continue;
        for (const target of output) {
          if (isRecord(target) && typeof target.node === "string")
            result.push({
              source,
              target: target as unknown as N8nConnectionTarget,
            });
        }
      }
    }
  }
  return result;
}

function disconnectedNodeNames(workflow: N8nWorkflow): string[] {
  const names = new Set(workflow.nodes.map((node) => node.name));
  const triggers = workflow.nodes
    .filter((node) => TRIGGER_NODE_TYPES.has(node.type))
    .map((node) => node.name);
  if (!triggers.length) return Array.from(names);
  const graph = new Map<string, Set<string>>();
  names.forEach((name) => graph.set(name, new Set()));
  connectionTargets(workflow).forEach(({ source, target }) => {
    if (!graph.has(source) || !graph.has(target.node)) return;
    graph.get(source)?.add(target.node);
    graph.get(target.node)?.add(source);
  });
  const visited = new Set<string>();
  const queue = [...triggers];
  while (queue.length) {
    const name = queue.shift() as string;
    if (visited.has(name)) continue;
    visited.add(name);
    graph.get(name)?.forEach((next) => {
      if (!visited.has(next)) queue.push(next);
    });
  }
  return Array.from(names).filter((name) => !visited.has(name));
}

export function validateN8nWorkflow(input: unknown): WorkflowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(input))
    return {
      valid: false,
      errors: ["Workflow must be a JSON object."],
      warnings,
      repaired: false,
    };
  const workflow = input as unknown as N8nWorkflow;
  if (typeof workflow.name !== "string" || !workflow.name.trim())
    errors.push("Workflow name is required.");
  if (!Array.isArray(workflow.nodes))
    errors.push("Workflow nodes must be an array.");
  if (!isRecord(workflow.connections))
    errors.push("Workflow connections must be an object.");
  if (!isRecord(workflow.settings)) errors.push("Workflow settings are required.");
  if (!Array.isArray(workflow.nodes))
    return { valid: false, errors, warnings, repaired: false };
  if (workflow.nodes.length === 0) errors.push("At least one node is required.");
  if (workflow.nodes.length > 50)
    errors.push("Version one supports at most 50 nodes per workflow.");
  const names = new Set<string>();
  const ids = new Set<string>();
  workflow.nodes.forEach((node, index) => {
    if (!isRecord(node)) {
      errors.push(`Node ${index + 1} must be an object.`);
      return;
    }
    if (typeof node.name !== "string" || !node.name.trim())
      errors.push(`Node ${index + 1} is missing a name.`);
    else if (names.has(node.name)) errors.push(`Duplicate node name: ${node.name}.`);
    else names.add(node.name);
    if (typeof node.id !== "string" || !node.id.trim())
      errors.push(`Node ${index + 1} is missing an ID.`);
    else if (ids.has(node.id)) errors.push(`Duplicate node ID: ${node.id}.`);
    else ids.add(node.id);
    if (typeof node.type !== "string" || !node.type)
      errors.push(`Node ${node.name || index + 1} is missing a type.`);
    else if (HIGH_RISK_NODE_TYPES.has(node.type))
      errors.push(`High-risk node type is not allowed: ${node.type}.`);
    else if (!SUPPORTED_NODE_TYPES.has(node.type))
      errors.push(`Unsupported node type: ${node.type}.`);
    if (typeof node.typeVersion !== "number")
      errors.push(`Node ${node.name || index + 1} is missing typeVersion.`);
    if (
      !Array.isArray(node.position) ||
      node.position.length !== 2 ||
      !node.position.every((value) => typeof value === "number")
    )
      errors.push(`Node ${node.name || index + 1} has an invalid position.`);
    if (!isRecord(node.parameters))
      errors.push(`Node ${node.name || index + 1} is missing parameters.`);
    if ("credentials" in node && Object.keys((node.credentials as object) || {}).length)
      errors.push(`Node ${node.name || index + 1} contains embedded credentials.`);
  });
  if (!workflow.nodes.some((node) => TRIGGER_NODE_TYPES.has(node.type)))
    errors.push("Workflow is missing a supported trigger node.");
  if (isRecord(workflow.connections)) {
    for (const [source, groups] of Object.entries(workflow.connections)) {
      if (!names.has(source)) errors.push(`Connection source does not exist: ${source}.`);
      if (!isRecord(groups)) {
        errors.push(`Connections for ${source} must be an object.`);
        continue;
      }
      for (const [type, outputs] of Object.entries(groups)) {
        if (!Array.isArray(outputs)) {
          errors.push(`Connection group ${source}.${type} must be an array.`);
          continue;
        }
        outputs.forEach((output, outputIndex) => {
          if (!Array.isArray(output)) {
            errors.push(`Connection output ${source}.${type}[${outputIndex}] is invalid.`);
            return;
          }
          output.forEach((target) => {
            if (!isRecord(target) || typeof target.node !== "string")
              errors.push(`Connection target from ${source} is invalid.`);
            else if (!names.has(target.node))
              errors.push(`Connection target does not exist: ${target.node}.`);
          });
        });
      }
    }
  }
  const disconnected = disconnectedNodeNames(workflow);
  if (disconnected.length)
    errors.push(`Disconnected nodes: ${disconnected.join(", ")}.`);
  const secretFields = findAutomationSecrets(workflow);
  if (secretFields.length)
    errors.push(`Possible embedded secret detected in: ${secretFields.join(", ")}.`);
  const authorizationFields = findAuthorizationFields(workflow);
  if (authorizationFields.length)
    errors.push(
      `Suspicious authorization fields detected in: ${authorizationFields.join(", ")}.`,
    );
  const unsafeExpressions = collectStrings(workflow).filter((text) =>
    UNSUPPORTED_EXPRESSION_PATTERNS.some((pattern) => pattern.test(text)),
  );
  if (unsafeExpressions.length)
    errors.push("Unsupported or unsafe expression detected.");
  if (!workflow.nodes.some((node) => node.type === SUPPORTED_NODE_CATALOGUE.stopAndError.type))
    warnings.push("No explicit Stop And Error path is included; review failure behaviour in n8n.");
  return {
    valid: errors.length === 0,
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
    repaired: false,
  };
}

export function repairN8nWorkflow(input: N8nWorkflow): N8nWorkflow {
  const workflow = JSON.parse(JSON.stringify(input)) as N8nWorkflow;
  workflow.settings ||= { executionOrder: "v1" };
  workflow.pinData ||= {};
  workflow.meta ||= { templateCredsSetupCompleted: false };
  workflow.tags ||= [];
  workflow.active = false;
  const names = new Set(workflow.nodes.map((node) => node.name));
  const ids = new Set<string>();
  workflow.nodes.forEach((node, index) => {
    let id = node.id || `node-${index + 1}`;
    while (ids.has(id)) id = `${id}-${index + 1}`;
    ids.add(id);
    node.id = id;
    if (!Array.isArray(node.position) || node.position.length !== 2)
      node.position = [220 + (index % 4) * 280, 160 + Math.floor(index / 4) * 220];
    node.parameters = isRecord(node.parameters) ? node.parameters : {};
    delete (node as N8nNode & { credentials?: unknown }).credentials;
  });
  const repairedConnections: N8nWorkflow["connections"] = {};
  for (const [source, groups] of Object.entries(workflow.connections || {})) {
    if (!names.has(source) || !isRecord(groups)) continue;
    for (const [type, outputs] of Object.entries(groups)) {
      if (!Array.isArray(outputs)) continue;
      const cleaned = outputs.map((output) =>
        Array.isArray(output)
          ? output.filter(
              (target): target is N8nConnectionTarget =>
                isRecord(target) &&
                typeof target.node === "string" &&
                names.has(target.node),
            )
          : [],
      );
      if (cleaned.some((output) => output.length)) {
        repairedConnections[source] ||= {};
        repairedConnections[source][type] = cleaned;
      }
    }
  }
  workflow.connections = repairedConnections;
  return workflow;
}
