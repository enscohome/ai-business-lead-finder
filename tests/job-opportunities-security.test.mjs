import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260803_job_opportunities.sql", "utf8");
const opportunitiesApi = readFileSync("app/api/opportunities/route.ts", "utf8");
const detailApi = readFileSync("app/api/opportunities/[id]/route.ts", "utf8");
const applicationsApi = readFileSync("app/api/opportunities/[id]/applications/route.ts", "utf8");
const decisionApi = readFileSync("app/api/opportunities/applications/[id]/route.ts", "utf8");
const conversationApi = readFileSync("app/api/opportunities/conversations/[id]/route.ts", "utf8");
const messageApi = readFileSync("app/api/opportunities/conversations/[id]/messages/route.ts", "utf8");
const reportApi = readFileSync("app/api/opportunities/reports/route.ts", "utf8");
const adminApi = readFileSync("app/api/admin/opportunities/route.ts", "utf8");
const destination = readFileSync("lib/notification-destination.ts", "utf8");

test("all opportunity API routes require an authenticated server user", () => {
  for (const source of [opportunitiesApi, detailApi, applicationsApi, decisionApi, conversationApi, messageApi, reportApi, adminApi])
    assert.match(source, /requireOpportunityUser/);
});
test("new opportunities are always pending review", () => assert.match(opportunitiesApi, /status: "pending_review"/));
test("the public feed is restricted to approved open posts", () => { assert.match(opportunitiesApi, /eq\("status", "open"\)/); assert.match(opportunitiesApi, /not\("approved_at", "is", null\)/); });
test("RLS exposes ordinary posts only when open and approved", () => assert.match(migration, /status='open' AND approved_at IS NOT NULL/));
test("users can update only their own opportunity through the server", () => assert.match(detailApi, /opportunity\.owner_id !== auth\.user\.id/));
test("important edits return approved posts to moderation", () => { assert.match(detailApi, /importantEdit = opportunity\.status === "open"/); assert.match(detailApi, /status: "pending_review"/); });
test("self-application is blocked", () => assert.match(applicationsApi, /opportunity\.owner_id === auth\.user\.id/));
test("a freelancer profile is required before applying", () => assert.match(applicationsApi, /freelancer_profiles/));
test("duplicate active applications are prevented by database index", () => assert.match(migration, /opportunity_applications_active_unique[\s\S]*submitted','shortlisted','accepted/));
test("only one accepted applicant is enforced by database index", () => assert.match(migration, /opportunity_one_accepted/));
test("application status changes verify applicant or job poster", () => { assert.match(decisionApi, /isApplicant/); assert.match(decisionApi, /isPoster/); });
test("acceptance prevents double hiring and closes the opportunity", () => { assert.match(decisionApi, /Another applicant has already been accepted/); assert.match(decisionApi, /status: "closed"/); });
test("conversations are created only after shortlist or acceptance", () => assert.match(decisionApi, /\["shortlisted", "accepted"\]\.includes\(nextStatus\)/));
test("random users cannot load conversations", () => assert.match(conversationApi, /\[data\.job_poster_id, data\.freelancer_id\]\.includes\(auth\.user\.id\)/));
test("message RLS permits conversation participants only", () => assert.match(migration, /Message participants read[\s\S]*auth\.uid\(\) IN \(c\.job_poster_id,c\.freelancer_id\)/));
test("senders cannot choose an arbitrary sender id", () => { assert.match(messageApi, /sender_id: auth\.user\.id/); assert.doesNotMatch(messageApi, /body\.sender/); });
test("blocking prevents new messages", () => { assert.match(messageApi, /opportunity_blocks/); assert.match(migration, /NOT EXISTS\(SELECT 1 FROM public\.opportunity_blocks/); });
test("messages are rate limited", () => assert.match(messageApi, /Hourly message limit reached/));
test("saved opportunities have a duplicate-proof composite primary key", () => assert.match(migration, /PRIMARY KEY\(user_id,opportunity_id\)/));
test("reports prevent duplicate active reports", () => { assert.match(migration, /community_reports_active_unique/); assert.match(reportApi, /Daily report limit reached/); });
test("reports are private to reporter and authorised moderator", () => assert.match(migration, /reporter_id=auth\.uid\(\) OR public\.is_opportunity_moderator\(\)/));
test("only the existing owner, admin and moderator allowlist can moderate", () => { assert.match(migration, /role IN \('owner','admin','moderator'\)/); assert.match(adminApi, /isOpportunityModerator/); });
test("direct mutations are revoked and server routes perform validated writes", () => assert.match(migration, /REVOKE ALL ON public\.opportunities/));
test("notification deep links map opportunities, applicants and messages", () => { assert.match(destination, /\/opportunities\//); assert.match(destination, /\/messages\//); assert.match(destination, /opportunityApplicantTypes/); });
