import type {
  PromptOutputs,
  WebsitePromptFormData,
} from "@/types/website-prompt";

const MAX = {
  short: 120,
  medium: 600,
  long: 2500,
  list: 30,
} as const;

export function cleanText(value: unknown, max: number = MAX.medium) {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";
}

function cleanList(value: unknown, maxItems: number = MAX.list) {
  return Array.isArray(value)
    ? value
        .slice(0, maxItems)
        .map((item) => cleanText(item, MAX.short))
        .filter(Boolean)
    : [];
}

function safeUrl(value: unknown) {
  const text = cleanText(value, 500);
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export function sanitizeWebsitePromptInput(
  input: unknown,
): WebsitePromptFormData {
  const value = (input && typeof input === "object" ? input : {}) as Record<
    string,
    any
  >;
  const design = (value.designPreferences || {}) as Record<string, any>;
  const technical = (value.technicalPreferences || {}) as Record<string, any>;
  const contact = (value.contactInformation || {}) as Record<string, any>;
  return {
    projectName: cleanText(value.projectName, MAX.short),
    businessName: cleanText(value.businessName, MAX.short),
    industry: cleanText(value.industry, MAX.short),
    businessDescription: cleanText(value.businessDescription, MAX.long),
    productsServices: cleanText(value.productsServices, MAX.long),
    targetCustomers: cleanText(value.targetCustomers, MAX.long),
    countryCode: "NG",
    city: cleanText(value.city, MAX.short),
    existingWebsiteUrl: safeUrl(value.existingWebsiteUrl),
    websitePurpose: cleanList(value.websitePurpose),
    otherPurpose: cleanText(value.otherPurpose, MAX.medium),
    selectedPages: cleanList(value.selectedPages),
    customPages: cleanList(value.customPages, 15),
    selectedFeatures: cleanList(value.selectedFeatures),
    customFeatures: cleanList(value.customFeatures, 20),
    designPreferences: {
      preferredColours: cleanText(design.preferredColours),
      coloursToAvoid: cleanText(design.coloursToAvoid),
      style: cleanList(design.style, 12),
      fontPreference: cleanText(design.fontPreference),
      appearance: ["light", "dark", "system"].includes(design.appearance)
        ? design.appearance
        : "system",
      logoAvailability: ["yes", "no", "in-progress"].includes(
        design.logoAvailability,
      )
        ? design.logoAvailability
        : "no",
      preferredLayout: cleanText(design.preferredLayout),
      exampleWebsites: cleanText(design.exampleWebsites, 1000),
      brandFeeling: cleanText(design.brandFeeling),
    },
    technicalPreferences: {
      technologies: cleanList(technical.technologies, 15),
      requirements: cleanList(technical.requirements, 20),
    },
    contactInformation: {
      phone: cleanText(contact.phone, 40),
      whatsapp: cleanText(contact.whatsapp, 40),
      email: cleanText(contact.email, 180),
      address: cleanText(contact.address, 500),
      socialLinks: cleanText(contact.socialLinks, 1500),
      openingHours: cleanText(contact.openingHours, 500),
    },
  };
}

export function validateWebsitePromptInput(data: WebsitePromptFormData) {
  const errors: string[] = [];
  if (!data.projectName) errors.push("Project name is required.");
  if (!data.businessName) errors.push("Business name is required.");
  if (!data.industry) errors.push("Business type or industry is required.");
  if (!data.businessDescription)
    errors.push("Business description is required.");
  if (!data.productsServices)
    errors.push("Main products or services are required.");
  if (!data.targetCustomers) errors.push("Target customers are required.");
  if (!data.websitePurpose.length && !data.otherPurpose)
    errors.push("Choose at least one website purpose.");
  if (!data.selectedPages.length && !data.customPages.length)
    errors.push("Choose at least one page.");
  return errors;
}

export function sanitizePromptOutputs(input: unknown): PromptOutputs {
  const value =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const clean = (item: unknown) =>
    typeof item === "string"
      ? item
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
          .slice(0, 100000)
      : "";
  return {
    codex: clean(value.codex),
    claude: clean(value.claude),
    kimi: clean(value.kimi),
    general: clean(value.general),
  };
}

const show = (items: string[]) =>
  items.length ? items.join(", ") : "Not specified";
const value = (text: string) => text || "Not specified";

function facts(data: WebsitePromptFormData) {
  return `Business name: ${data.businessName}\nIndustry: ${data.industry}\nBusiness background: ${data.businessDescription}\nProducts/services: ${data.productsServices}\nTarget audience: ${data.targetCustomers}\nLocation: ${data.city ? `${data.city}, ` : ""}Nigeria\nExisting website: ${value(data.existingWebsiteUrl)}\nWebsite goals: ${show([...data.websitePurpose, data.otherPurpose].filter(Boolean))}\nRequired pages: ${show([...data.selectedPages, ...data.customPages])}\nRequired features: ${show([...data.selectedFeatures, ...data.customFeatures])}\nDesign styles: ${show(data.designPreferences.style)}\nPreferred colours: ${value(data.designPreferences.preferredColours)}\nColours to avoid: ${value(data.designPreferences.coloursToAvoid)}\nAppearance: ${data.designPreferences.appearance}\nFont preference: ${value(data.designPreferences.fontPreference)}\nLogo: ${data.designPreferences.logoAvailability}\nLayout direction: ${value(data.designPreferences.preferredLayout)}\nExample websites: ${value(data.designPreferences.exampleWebsites)}\nDesired brand feeling: ${value(data.designPreferences.brandFeeling)}\nTechnology: ${show(data.technicalPreferences.technologies)}\nTechnical requirements: ${show(data.technicalPreferences.requirements)}\nContact details supplied: ${show(
    Object.entries(data.contactInformation)
      .filter(([, item]) => item)
      .map(([key, item]) => `${key}: ${item}`),
  )}`;
}

export function buildPromptOutputs(data: WebsitePromptFormData): PromptOutputs {
  const context = facts(data);
  const shared = `\n\nPROJECT FACTS (do not fabricate missing information)\n${context}\n\nCreate clear navigation, meaningful calls to action, responsive mobile/tablet/desktop behaviour, accessible forms, validation, permissions, security controls, loading/error/empty states, SEO foundations, tests, and deployment preparation. Mark any necessary assumption as OPTIONAL ASSUMPTION and ask before making a consequential product decision.`;
  return {
    codex: `You are Codex working on “${data.projectName}”. First inspect the repository and its instructions. If an existing repository is provided, create a separate branch, follow its conventions, and preserve every working feature. Implement the requested pages, reusable components, server-side APIs, data model, authentication, permissions, payment flows, and admin functions that the project facts require. Keep credentials server-side and never expose or print secrets. Validate and sanitize inputs. Provide database migrations and manual setup steps without applying production migrations unless authorised. Run TypeScript checks, lint, relevant tests, and a production build. Finish with every changed file, migration, environment-variable name, testing result, known limitation, and anything still requiring manual work. Do not deploy, push, or merge without explicit permission.${shared}`,
    claude: `Act as a senior product engineer and turn the following product definition into clean, maintainable production code. Begin with a concise architecture and folder structure. Separate frontend, backend, database, API, authentication, authorization, payment, admin, content, and testing requirements. Prefer small reusable components and documented interfaces. Include schema migrations, row-level access rules, API contracts, setup instructions, seed/test strategy, and local testing steps. Explain important trade-offs before implementation and keep the delivered folder structure easy for another developer to maintain.${shared}`,
    kimi: `Complete this project in explicit stages. 1) Restate the design system and responsive layout. 2) List every page and its sections. 3) Define database tables, relationships, indexes, and access rules. 4) Define every user and admin function. 5) Implement APIs and integrations securely. 6) Implement complete frontend files. 7) Add validation and failure states. 8) Test locally and run the production build. Return complete files, not partial snippets or placeholders. List every required environment-variable name without including secret values. Give exact local run and migration instructions. End with completed work, unfinished tasks, risks, and manual configuration.${shared}`,
    general: `GENERAL WEBSITE BRIEF — ${data.projectName}\n\nPROJECT SUMMARY\nCreate a professional website for ${data.businessName}, a ${data.industry} business serving ${data.targetCustomers}.\n\nBUSINESS BACKGROUND\n${data.businessDescription}\nProducts and services: ${data.productsServices}\nLocation: ${data.city ? `${data.city}, ` : ""}Nigeria\n\nWEBSITE GOALS\n${show([...data.websitePurpose, data.otherPurpose].filter(Boolean))}\n\nPAGES AND CONTENT\n${show([...data.selectedPages, ...data.customPages])}. Each page needs a clear purpose, useful content hierarchy, relevant calls to action, and honest placeholders for content the business has not supplied.\n\nFEATURES\n${show([...data.selectedFeatures, ...data.customFeatures])}\n\nDESIGN DIRECTION\nStyle: ${show(data.designPreferences.style)}. Preferred colours: ${value(data.designPreferences.preferredColours)}. Avoid: ${value(data.designPreferences.coloursToAvoid)}. Brand feeling: ${value(data.designPreferences.brandFeeling)}. Appearance: ${data.designPreferences.appearance}. Layout: ${value(data.designPreferences.preferredLayout)}.\n\nTECHNICAL DIRECTION\nPreferred technology: ${show(data.technicalPreferences.technologies)}. Requirements: ${show(data.technicalPreferences.requirements)}. Use reusable components and secure server-side integrations.\n\nMOBILE, ACCESSIBILITY AND QUALITY\nDesign mobile-first for phones, tablets, and desktops. Use keyboard-accessible navigation, labelled forms, readable contrast, optimized images, loading/error/empty states, and practical performance budgets.\n\nSECURITY AND PRIVACY\nValidate input, enforce authorization server-side, protect personal data, keep secrets out of client code, rate-limit sensitive endpoints, use secure cookies, and document retention and deletion.\n\nSEO\nProvide descriptive metadata, semantic headings, indexable page content, social-sharing metadata, sitemap support, and structured data where appropriate.\n\nSUGGESTED STAGES\n1. Confirm scope and content. 2. Create information architecture and wireframes. 3. Build the design system and core pages. 4. Add database and integrations. 5. Test accessibility, security, responsiveness, and performance. 6. Prepare deployment and handover; deploy only after approval.\n\nOPTIONAL ASSUMPTIONS\nNo business details beyond those listed above should be invented. Confirm unspecified content, integration providers, legal text, and hosting choices before launch.`,
  };
}
