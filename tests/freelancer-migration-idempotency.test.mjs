import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const freelancerPath = "supabase/migrations/20260801_freelancer_profiles.sql";
const opportunitiesPath = "supabase/migrations/20260803_job_opportunities.sql";
const freelancer = readFileSync(freelancerPath, "utf8");
const opportunities = readFileSync(opportunitiesPath, "utf8");

const tables = [
  "app_admins",
  "freelancer_profiles",
  "freelancer_private_details",
  "freelancer_username_history",
  "freelancer_social_links",
  "freelancer_portfolio_projects",
  "freelancer_review_requests",
  "freelancer_reviews",
  "freelancer_review_reports",
  "freelancer_verification_applications",
  "freelancer_security_events",
];

test("an existing app_admins table and owner row are never recreated or mutated", () => {
  assert.match(freelancer, /CREATE TABLE IF NOT EXISTS public\.app_admins/);
  assert.doesNotMatch(freelancer, /DROP TABLE(?: IF EXISTS)? public\.app_admins/i);
  assert.doesNotMatch(freelancer, /TRUNCATE(?: TABLE)? public\.app_admins/i);
  assert.doesNotMatch(freelancer, /INSERT INTO public\.app_admins/i);
  assert.doesNotMatch(freelancer, /UPDATE public\.app_admins/i);
  assert.doesNotMatch(freelancer, /DELETE FROM public\.app_admins/i);
});

test("fresh app_admins installations allow owner, admin and moderator roles", () => {
  assert.match(
    freelancer,
    /CHECK \(role IN \('owner', 'admin', 'moderator'\)\)/,
  );
  assert.match(freelancer, /ADD CONSTRAINT app_admins_role_check/);
});

test("all missing freelancer tables use repeatable creation", () => {
  for (const table of tables)
    assert.match(
      freelancer,
      new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\s*\\(`),
      `${table} must be created with IF NOT EXISTS`,
    );
});

test("review requests and reviews retain their ownership and single-use links", () => {
  assert.match(
    freelancer,
    /CREATE TABLE IF NOT EXISTS public\.freelancer_review_requests[\s\S]*unique_token TEXT NOT NULL UNIQUE[\s\S]*expires_at TIMESTAMPTZ NOT NULL/,
  );
  assert.match(
    freelancer,
    /CREATE TABLE IF NOT EXISTS public\.freelancer_reviews[\s\S]*review_request_id UUID NOT NULL UNIQUE REFERENCES public\.freelancer_review_requests\(id\) ON DELETE RESTRICT/,
  );
  assert.match(
    freelancer,
    /freelancer_id UUID NOT NULL REFERENCES public\.freelancer_profiles\(id\) ON DELETE CASCADE/,
  );
});

test("every migration-created index is repeatable", () => {
  const indexes = freelancer.match(/^CREATE (?:UNIQUE )?INDEX.*$/gm) || [];
  assert.ok(indexes.length >= 4);
  for (const statement of indexes)
    assert.match(statement, /INDEX IF NOT EXISTS/);
});

test("every policy is dropped safely before it is recreated", () => {
  const policies = Array.from(
    freelancer.matchAll(/CREATE POLICY "([^"]+)" ON ([^\s;]+)/g),
  );
  assert.ok(policies.length >= 20);
  for (const [, name, table] of policies)
    assert.ok(
      freelancer.includes(`DROP POLICY IF EXISTS "${name}" ON ${table};`),
      `${name} on ${table} needs a repeatable drop`,
    );
});

test("functions, triggers, buckets and RLS remain repeatable", () => {
  assert.doesNotMatch(freelancer, /CREATE FUNCTION public\./);
  assert.match(freelancer, /CREATE OR REPLACE FUNCTION public\.is_leadpilot_admin/);
  assert.match(
    freelancer,
    /DROP TRIGGER IF EXISTS protect_freelancer_verification ON public\.freelancer_profiles;[\s\S]*CREATE TRIGGER protect_freelancer_verification/,
  );
  assert.match(freelancer, /ON CONFLICT \(id\) DO UPDATE/);
  for (const table of tables)
    assert.match(
      freelancer,
      new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`),
    );
});

test("Job Opportunities review integration can run after the freelancer prerequisite", () => {
  assert.ok(freelancerPath < opportunitiesPath);
  assert.match(
    opportunities,
    /ALTER TABLE public\.freelancer_review_requests\s+ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES public\.opportunities\(id\) ON DELETE SET NULL/,
  );
  assert.match(
    opportunities,
    /CREATE UNIQUE INDEX IF NOT EXISTS freelancer_review_requests_opportunity_idx/,
  );
});
