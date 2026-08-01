import { SavedLead, Business } from "@/types";

export function exportLeadsToCSV(leads: SavedLead[]): string {
  const headers = [
    "Provider Record ID",
    "Lead Status",
    "Notes",
    "Tags",
    "Saved Date",
  ];

  const rows = leads.map((lead) => [
    lead.businessId,
    lead.status,
    lead.notes,
    lead.tags.join(", "),
    new Date(lead.createdAt).toLocaleDateString(),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csvContent;
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportBusinessesToCSV(businesses: Business[]): string {
  void businesses;
  return '"Export unavailable"\n"Google-derived business fields are restricted pending provider licensing confirmation."';
}
