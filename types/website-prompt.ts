export type PromptTarget = "codex" | "claude" | "kimi" | "general";

export interface WebsitePromptFormData {
  projectName: string;
  businessName: string;
  industry: string;
  businessDescription: string;
  productsServices: string;
  targetCustomers: string;
  countryCode: "NG";
  city: string;
  existingWebsiteUrl: string;
  websitePurpose: string[];
  otherPurpose: string;
  selectedPages: string[];
  customPages: string[];
  selectedFeatures: string[];
  customFeatures: string[];
  designPreferences: {
    preferredColours: string;
    coloursToAvoid: string;
    style: string[];
    fontPreference: string;
    appearance: "light" | "dark" | "system";
    logoAvailability: "yes" | "no" | "in-progress";
    preferredLayout: string;
    exampleWebsites: string;
    brandFeeling: string;
  };
  technicalPreferences: {
    technologies: string[];
    requirements: string[];
  };
  contactInformation: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    socialLinks: string;
    openingHours: string;
  };
}

export interface PromptOutputs {
  codex: string;
  claude: string;
  kimi: string;
  general: string;
}

export interface WebsitePromptProject {
  id: string;
  project_name: string;
  business_name: string;
  industry: string;
  target_ai: PromptTarget;
  generated_prompt: string;
  general_brief: string;
  form_data: WebsitePromptFormData;
  prompt_outputs: PromptOutputs;
  status: "draft" | "generated";
  created_at: string;
  updated_at: string;
}
