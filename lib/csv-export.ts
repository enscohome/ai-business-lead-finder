import { SavedLead, Business } from "@/types";

export function exportLeadsToCSV(leads: SavedLead[]): string {
  const headers = [
    "Business Name",
    "Business Type",
    "Phone",
    "Address",
    "City",
    "State",
    "Country",
    "Website",
    "Website Status",
    "Opportunity Score",
    "Google Maps URL",
    "Rating",
    "Review Count",
    "Lead Status",
    "Notes",
    "Tags",
    "Saved Date",
  ];

  const rows = leads.map((lead) => [
    lead.business.name,
    lead.business.businessType,
    lead.business.phone,
    lead.business.address,
    lead.business.city,
    lead.business.state,
    lead.business.country,
    lead.business.website || "",
    lead.business.websiteStatus,
    lead.business.opportunityScore,
    lead.business.googleMapsUrl,
    lead.business.rating?.toString() || "",
    lead.business.reviewCount?.toString() || "",
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
  const headers = [
    "Business Name",
    "Business Type",
    "Phone",
    "Address",
    "City",
    "State",
    "Country",
    "Website",
    "Website Status",
    "Opportunity Score",
    "Google Maps URL",
    "Rating",
    "Review Count",
  ];

  const rows = businesses.map((biz) => [
    biz.name,
    biz.businessType,
    biz.phone,
    biz.address,
    biz.city,
    biz.state,
    biz.country,
    biz.website || "",
    biz.websiteStatus,
    biz.opportunityScore,
    biz.googleMapsUrl,
    biz.rating?.toString() || "",
    biz.reviewCount?.toString() || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csvContent;
}
