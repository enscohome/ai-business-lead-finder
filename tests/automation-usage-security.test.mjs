import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const migration = read(
  "supabase/migrations/20260803_automation_workflow_builder.sql",
);
const premiumMigration = read(
  "supabase/migrations/20260802_website_prompt_builder_premium_gate.sql",
);
const automationRoute = read("app/api/automation-builder/generate/route.ts");
const projectRoute = read(
  "app/api/automation-builder/projects/[id]/route.ts",
);
const websitePromptRoute = read(
  "app/api/website-prompt-builder/generate/route.ts",
);
const workflowValidator = read("lib/automation-builder/validator.ts");
const plans = read("lib/plans.ts");

function functionBody(sql, signaturePattern, returnPattern) {
  const match = sql.match(
    new RegExp(
      `CREATE OR REPLACE FUNCTION ${signaturePattern}([\\s\\S]*?)${returnPattern}`,
    ),
  );
  assert.ok(match, `Could not find SQL function ${signaturePattern}`);
  return match[1];
}

test("callers cannot supply 999999 or any other automation allowance", () => {
  const signature = migration.match(
    /CREATE OR REPLACE FUNCTION public\.save_automation_workflow_generation\(([\s\S]*?)\)\s*RETURNS TABLE/,
  );
  assert.ok(signature);
  assert.doesNotMatch(signature[1], /p_limit/i);
  assert.doesNotMatch(automationRoute, /p_limit/);
  assert.doesNotMatch(websitePromptRoute, /p_limit/);
  assert.doesNotMatch(automationRoute, /999999/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.consume_website_prompt_generation\(UUID,INTEGER\)\s+FROM PUBLIC, authenticated;/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.consume_website_prompt_allowance\(UUID,INTEGER\)\s+FROM PUBLIC, authenticated;/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.consume_website_prompt_generation\(UUID\)\s+TO authenticated;/,
  );
  assert.doesNotMatch(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.consume_website_prompt_generation\(UUID,INTEGER\)/,
  );
});

test("the secure consumer derives and rechecks paid-plan limits", () => {
  const configuredLimits = { starter: 50, pro: 250, agency: 750 };
  for (const [plan, limit] of Object.entries(configuredLimits)) {
    assert.match(
      plans,
      new RegExp(
        `${plan}: \\{[\\s\\S]*?websitePromptGenerationsPerMonth: ${limit},`,
      ),
    );
    assert.match(migration, new RegExp(`WHEN '${plan}' THEN ${limit}`));
    assert.match(
      premiumMigration,
      new RegExp(`WHEN '${plan}' THEN ${limit}`),
    );
  }
  assert.match(
    migration,
    /NOT public\.has_website_prompt_access\(true\)/,
  );
  assert.match(premiumMigration, /IF p_limit<>expected_limit THEN RETURN NULL;/);
});

test("owner access returns without deducting usage", () => {
  const secureConsumer = functionBody(
    migration,
    "public\\.consume_website_prompt_generation\\(p_user_id UUID\\)",
    "END \\$\\$;",
  );
  const ownerCheck = secureConsumer.indexOf("public.is_leadpilot_owner()");
  const delegatedConsume = secureConsumer.lastIndexOf(
    "consume_website_prompt_generation(p_user_id,v_limit)",
  );
  assert.ok(ownerCheck >= 0 && delegatedConsume > ownerCheck);
  const ownerBranch = secureConsumer.slice(ownerCheck, delegatedConsume);
  assert.match(ownerBranch, /RETURN COALESCE\(v_current_usage,0\);/);
  assert.doesNotMatch(ownerBranch, /UPDATE public\.user_profiles/);
});

test("ownership checks prevent cross-user project modification", () => {
  const saveFunction = functionBody(
    migration,
    "public\\.save_automation_workflow_generation\\(",
    "END \\$\\$;",
  );
  assert.match(saveFunction, /auth\.uid\(\) <> p_user_id/);
  assert.match(
    saveFunction,
    /WHERE id=p_project_id AND user_id=p_user_id/,
  );
  assert.match(projectRoute, /\.eq\("id", params\.id\)/);
  assert.match(projectRoute, /\.eq\("user_id", user\.id\)/);
});

test("validation failures occur before the atomic usage-saving RPC", () => {
  function assertSafeOrdering(routeSource) {
    const inputSecretScan = routeSource.indexOf("const secretFields = [");
    const inputSecretRejection = routeSource.indexOf(
      "if (secretFields.length)",
      inputSecretScan,
    );
    const firstWorkflowValidation = routeSource.indexOf(
      "const firstValidation = validateN8nWorkflow(workflow);",
    );
    const validationFailure = routeSource.indexOf("if (!validation.valid)");
    const saveRpc = routeSource.indexOf(
      '"save_automation_workflow_generation"',
    );
    assert.ok(inputSecretScan >= 0, "Input secret detection must be present.");
    assert.ok(
      inputSecretRejection > inputSecretScan &&
        firstWorkflowValidation > inputSecretRejection,
      "Input secrets must be rejected before generated workflow validation.",
    );
    assert.ok(
      validationFailure > firstWorkflowValidation,
      "The final validation decision must follow workflow validation.",
    );
    assert.ok(
      saveRpc > validationFailure,
      "Usage-saving must happen only after validation succeeds.",
    );

    const usageRpcCalls = Array.from(
      routeSource.matchAll(
        /"(save_automation_workflow_generation|consume_website_prompt_generation|consume_website_prompt_allowance)"/g,
      ),
    );
    assert.deepEqual(
      usageRpcCalls.map((match) => match[1]),
      ["save_automation_workflow_generation"],
    );
    assert.ok(
      usageRpcCalls.every((match) => (match.index ?? -1) > validationFailure),
      "No usage-saving or usage-deduction RPC may precede validation.",
    );

    const failurePath = routeSource.slice(validationFailure, saveRpc);
    assert.match(failurePath, /recordValidationFailure/);
    assert.doesNotMatch(failurePath, /consume_website_prompt_generation/);
  }

  assertSafeOrdering(automationRoute);
  assertSafeOrdering(automationRoute.replace(/\r?\n/g, "\r\n"));

  const validatorStart = workflowValidator.indexOf(
    "export function validateN8nWorkflow",
  );
  const generatedSecretScan = workflowValidator.indexOf(
    "const secretFields = findAutomationSecrets(workflow);",
    validatorStart,
  );
  const generatedSecretRejection = workflowValidator.indexOf(
    "if (secretFields.length)",
    generatedSecretScan,
  );
  const validationReturn = workflowValidator.indexOf(
    "valid: errors.length === 0",
    generatedSecretScan,
  );
  assert.ok(
    validatorStart >= 0 &&
      generatedSecretScan > validatorStart &&
      generatedSecretRejection > generatedSecretScan &&
      validationReturn > generatedSecretRejection,
    "Generated-workflow secret detection must complete before validation can succeed.",
  );

  const validationRecorder = functionBody(
    migration,
    "public\\.record_automation_validation_failure\\(",
    "END \\$\\$;",
  );
  assert.doesNotMatch(
    validationRecorder,
    /consume_website_prompt_generation/,
  );
});
