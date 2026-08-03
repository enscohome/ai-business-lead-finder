import type { AutomationArtifact } from "@/types/automation-workflow";

interface PdfLine {
  text: string;
  size: number;
  bold: boolean;
  gapAfter?: number;
}

const encoder = new TextEncoder();

function ascii(value: unknown): string {
  return String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, max = 92): string[] {
  const words = ascii(text).split(" ").filter(Boolean);
  if (!words.length) return ["Not specified"];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) current = word;
    else if (`${current} ${word}`.length <= max) current += ` ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function addSection(lines: PdfLine[], title: string, content: string | string[]) {
  lines.push({ text: title.toUpperCase(), size: 13, bold: true, gapAfter: 4 });
  const items = Array.isArray(content) ? content : [content];
  items.forEach((item) =>
    wrap(item).forEach((line, index) =>
      lines.push({
        text: Array.isArray(content) && index === 0 ? `- ${line}` : line,
        size: 10,
        bold: false,
      }),
    ),
  );
  lines.push({ text: "", size: 6, bold: false, gapAfter: 4 });
}

function guideLines(artifact: AutomationArtifact): PdfLine[] {
  const { requirements, plan, workflow } = artifact;
  const lines: PdfLine[] = [
    { text: "LeadPilot AI", size: 11, bold: true, gapAfter: 4 },
    { text: "AI Automation Builder - n8n Setup Guide", size: 20, bold: true, gapAfter: 8 },
    { text: plan.workflowName, size: 15, bold: true, gapAfter: 12 },
  ];
  addSection(lines, "Project summary", artifact.summary);
  addSection(lines, "Customer problem", requirements.customerProblem);
  addSection(lines, "Workflow purpose", requirements.desiredResult);
  addSection(
    lines,
    "Ordered workflow",
    plan.nodes.map(
      (node, index) => `${index + 1}. ${node.name}: ${node.purpose}`,
    ),
  );
  addSection(lines, "Data flow", plan.dataFlow);
  addSection(lines, "Conditions and decisions", plan.conditions);
  addSection(
    lines,
    "Credentials to create in n8n",
    artifact.requiredCredentials.length
      ? artifact.requiredCredentials
      : ["No external credential is required by the current node plan."],
  );
  addSection(
    lines,
    "Environment and placeholder configuration",
    [
      "Do not paste credentials into LeadPilot AI or the workflow JSON.",
      "Replace every REPLACE_WITH value inside n8n after import.",
      "Configure provider credentials through n8n Credentials and reference them from the relevant nodes.",
      "Confirm webhook base URL, timezone, execution retention, and encryption settings on the n8n instance.",
    ],
  );
  addSection(
    lines,
    "Import instructions",
    [
      "Open an isolated n8n test project and keep production workflows unchanged.",
      "Choose Import from File and select the downloaded workflow JSON.",
      "Keep the imported workflow inactive while reviewing every node.",
      "Connect credentials manually, replace placeholders, and save the workflow.",
    ],
  );
  addSection(
    lines,
    "Node configuration checklist",
    workflow.nodes.map(
      (node) => `${node.name}: confirm parameters, field mapping, credential selection, retries, and expected output.`,
    ),
  );
  addSection(
    lines,
    "Test data",
    requirements.sampleData ||
      "Create synthetic data matching the expected input fields. Do not use real customer personal data during initial testing.",
  );
  addSection(lines, "Testing checklist", artifact.testingInstructions);
  addSection(
    lines,
    "Common errors",
    [
      "Credential not selected: connect the correct n8n credential to the affected node.",
      "Field is undefined: inspect the previous node output and update the mapped expression.",
      "Webhook does not respond: verify the webhook mode, test URL, response node, and instance base URL.",
      "Schedule runs at the wrong time: confirm the workflow and instance timezones.",
      "API request is rejected: verify the approved endpoint, method, permissions, rate limit, and credential scope.",
    ],
  );
  addSection(
    lines,
    "Security warnings",
    [
      "Never store passwords, API keys, OAuth tokens, private keys, or authorization headers in workflow fields.",
      "Use least-privilege credentials and restrict who can view or edit the workflow.",
      "Minimize personal data, configure execution retention, and redact sensitive execution output.",
      "Do not add Execute Command, SSH, local file, dangerous Code, or unreviewed community nodes without a separate security review.",
      "LeadPilot AI does not execute, publish, or activate this workflow.",
    ],
  );
  addSection(
    lines,
    "Launch checklist",
    [
      "Validation status is valid and every warning has been reviewed.",
      "All placeholders, mappings, branches, recipients, URLs, and schedules are confirmed.",
      "A failure test and duplicate-execution test have passed.",
      "Customer approval and applicable privacy or outreach permissions are documented.",
      "A rollback or disable procedure is available before activation.",
    ],
  );
  addSection(lines, "Compatibility notes", plan.compatibilityNotes);
  lines.push({
    text: "Review and test this workflow in a safe n8n environment before using it with real customer data.",
    size: 11,
    bold: true,
  });
  return lines;
}

function paginate(lines: PdfLine[]): PdfLine[][] {
  const pages: PdfLine[][] = [];
  let page: PdfLine[] = [];
  let used = 0;
  const height = 690;
  for (const line of lines) {
    const required = line.size + 5 + (line.gapAfter || 0);
    if (page.length && used + required > height) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(line);
    used += required;
  }
  if (page.length) pages.push(page);
  return pages;
}

function contentStream(lines: PdfLine[], pageNumber: number, total: number): string {
  let y = 800;
  const commands = ["0.08 0.10 0.18 rg"];
  for (const line of lines) {
    const font = line.bold ? "F2" : "F1";
    if (line.text)
      commands.push(
        `BT /${font} ${line.size} Tf 50 ${y} Td (${escapePdfText(ascii(line.text))}) Tj ET`,
      );
    y -= line.size + 5 + (line.gapAfter || 0);
  }
  commands.push(
    `0.35 0.38 0.45 rg BT /F1 8 Tf 50 28 Td (LeadPilot AI - Setup documentation only - Page ${pageNumber} of ${total}) Tj ET`,
  );
  return commands.join("\n");
}

export function buildAutomationSetupGuidePdf(
  artifact: AutomationArtifact,
): Uint8Array {
  const pages = paginate(guideLines(artifact));
  const objectCount = 4 + pages.length * 2;
  const objects = new Array<string>(objectCount + 1).fill("");
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  const kids = pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ");
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  pages.forEach((page, index) => {
    const pageObject = 5 + index * 2;
    const contentObject = pageObject + 1;
    const stream = contentStream(page, index + 1, pages.length);
    objects[pageObject] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject] = `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`;
  });
  let output = "%PDF-1.4\n%LeadPilotAI\n";
  const offsets = new Array<number>(objects.length).fill(0);
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = encoder.encode(output).length;
    output += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = encoder.encode(output).length;
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1)
    output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(output);
}
