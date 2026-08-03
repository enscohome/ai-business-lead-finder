import { ArrowRight, CheckCircle2, Network, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUPPORTED_NODE_CATALOGUE } from "@/lib/automation-builder/catalogue";
import type { AutomationArtifact } from "@/types/automation-workflow";

export function WorkflowPreview({ artifact }: { artifact: AutomationArtifact }) {
  const integrations = artifact.plan.nodes
    .filter((node) =>
      ["integration", "ai"].includes(
        SUPPORTED_NODE_CATALOGUE[node.key].category,
      ),
    )
    .map((node) => SUPPORTED_NODE_CATALOGUE[node.key].label);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Workflow</p>
          <p className="mt-1 font-semibold">{artifact.plan.workflowName}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Nodes</p>
          <p className="mt-1 font-semibold">{artifact.workflow.nodes.length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Trigger</p>
          <p className="mt-1 font-semibold">{artifact.plan.trigger}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Validation</p>
          <Badge
            className="mt-1"
            variant={artifact.validation.valid ? "default" : "destructive"}
          >
            {artifact.validation.valid ? "Valid" : "Blocked"}
          </Badge>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Network className="h-5 w-5 text-primary" />
            Visual node preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-max grid-flow-col auto-cols-[11rem] gap-3">
              {artifact.plan.nodes.map((node, index) => (
                <div
                  key={`${node.name}-${index}`}
                  className="rounded-xl border bg-card p-3 shadow-sm"
                >
                    <Badge variant="outline" className="mb-2">
                      {SUPPORTED_NODE_CATALOGUE[node.key].category}
                    </Badge>
                    <p className="font-semibold">{node.name}</p>
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                      {node.purpose}
                    </p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {artifact.plan.connections.map((connection, index) => (
              <div
                key={`${connection.source}-${connection.target}-${index}`}
                className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-xs"
              >
                <strong>{connection.source}</strong>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span>{connection.target}</span>
                {connection.type && connection.type !== "main"
                  ? ` (${connection.type})`
                  : connection.sourceOutput === 1
                    ? " (false/error branch)"
                    : ""}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Integrations and credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              {(integrations.length ? integrations : ["No external integration"]).map(
                (item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ),
              )}
            </div>
            <ul className="space-y-2 text-muted-foreground">
              {(artifact.requiredCredentials.length
                ? artifact.requiredCredentials
                : ["No credential is required until an integration is configured."]
              ).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Safety and compatibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              {artifact.validation.valid ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              )}
              <p>{artifact.validation.valid ? "All blocking JSON safety checks passed." : artifact.validation.errors[0]}</p>
            </div>
            <p className="text-muted-foreground">Error path: {artifact.plan.errorPath}</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {artifact.plan.compatibilityNotes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
