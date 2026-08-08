import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20260803_job_opportunities.sql", "utf8");
const managedMigration = readFileSync("supabase/migrations/20260804_owner_control_centre.sql", "utf8");
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
test("the public feed is restricted to approved managed posts", () => { assert.match(opportunitiesApi, /in\("status", \["approved", "awaiting_assignment"\]\)/); assert.match(opportunitiesApi, /not\("approved_at", "is", null\)/); });
test("RLS exposes ordinary posts only in public managed states", () => assert.match(managedMigration, /status IN \('approved','awaiting_assignment'\)/));
test("users can update only their own opportunity through the server", () => assert.match(detailApi, /opportunity\.owner_id !== auth\.user\.id/));
test("requested client changes return to moderation", () => { assert.match(detailApi, /importantEdit = opportunity\.status === "changes_requested"/); assert.match(detailApi, /status: "pending_review"/); });
test("self-application is blocked", () => assert.match(applicationsApi, /opportunity\.owner_id === auth\.user\.id/));
test("a freelancer profile is required before applying", () => assert.match(applicationsApi, /freelancer_profiles/));
test("duplicate active applications are prevented by database index", () => assert.match(migration, /opportunity_applications_active_unique[\s\S]*submitted','shortlisted','accepted/));
test("only one accepted applicant is enforced by database index", () => assert.match(migration, /opportunity_one_accepted/));
test("application status changes verify applicant or job poster", () => { assert.match(decisionApi, /isApplicant/); assert.match(decisionApi, /isPoster/); });
test("clients cannot bypass the owner assignment workflow by accepting applicants", () => assert.doesNotMatch(decisionApi, /\["shortlisted", "accepted"\]/));
test("shortlisting creates only the two explicit ordinary participants", () => { assert.match(decisionApi, /nextStatus === "shortlisted"/); assert.match(decisionApi, /opportunity_conversation_participants/); });
test("random users cannot load conversations", () => { assert.match(conversationApi, /opportunity_conversation_participants/); assert.match(conversationApi, /eq\("user_id", auth\.user\.id\)/); });
test("message RLS permits explicit active conversation participants only", () => assert.match(managedMigration, /Participants only messages[\s\S]*is_opportunity_conversation_participant\(conversation_id\)/));
test("senders cannot choose an arbitrary sender id", () => { assert.match(messageApi, /sender_id: auth\.user\.id/); assert.doesNotMatch(messageApi, /body\.sender/); });
test("blocking prevents new messages", () => { assert.match(messageApi, /opportunity_blocks/); assert.match(migration, /NOT EXISTS\(SELECT 1 FROM public\.opportunity_blocks/); });
test("messages are rate limited", () => assert.match(messageApi, /Hourly message limit reached/));
test("saved opportunities have a duplicate-proof composite primary key", () => assert.match(migration, /PRIMARY KEY\(user_id,opportunity_id\)/));
test("reports prevent duplicate active reports", () => { assert.match(migration, /community_reports_active_unique/); assert.match(reportApi, /Daily report limit reached/); });
test("reports are private to reporter and authorised moderator", () => assert.match(migration, /reporter_id=auth\.uid\(\) OR public\.is_opportunity_moderator\(\)/));
test("only the existing owner, admin and moderator allowlist can moderate", () => { assert.match(migration, /role IN \('owner','admin','moderator'\)/); assert.match(adminApi, /isOpportunityModerator/); });
test("direct mutations are revoked and server routes perform validated writes", () => assert.match(migration, /REVOKE ALL ON public\.opportunities/));
test("notification deep links map opportunities, applicants and messages", () => { assert.match(destination, /\/opportunities\//); assert.match(destination, /\/messages\//); assert.match(destination, /opportunityApplicantTypes/); });
