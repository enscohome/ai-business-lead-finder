import { Business, AISalesTool } from "@/types";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data: OpenAIResponse = await response.json();
  return data.choices[0]?.message?.content || "";
}

export async function generateAIWebsitePitch(business: Business): Promise<AISalesTool> {
  const hasWebsite = business.websiteStatus !== "none";
  const websiteContext = hasWebsite
    ? `They have a ${business.websiteStatus} website at ${business.website}.`
    : "They do NOT have a website.";

  const systemPrompt = `You are an expert sales copywriter specializing in digital services for small businesses. 
Write persuasive, personalized sales pitches that are friendly, professional, and focused on value.
Keep the tone conversational but professional. Use Nigerian business context where appropriate.`;

  const userPrompt = `Write a personalized website sales pitch email for ${business.name}, a ${business.businessType.toLowerCase()} in ${business.city}, Nigeria.

Context:
- ${websiteContext}
- Address: ${business.address}
- Phone: ${business.phone}

The pitch should:
1. Open with a genuine compliment about their business
2. Identify the specific opportunity (new website, redesign, or AI automation upgrade)
3. Explain the business value (more customers, better credibility, 24/7 availability)
4. Include a soft call-to-action for a 10-15 minute call
5. Keep it under 300 words
6. Sign off as [Your Name] with placeholders for contact info

Format as a professional email.`;

  const content = await callOpenAI(systemPrompt, userPrompt);

  return {
    type: "website_pitch",
    title: "AI Website Sales Pitch",
    content,
  };
}

export async function generateAIWhatsAppMessage(business: Business): Promise<AISalesTool> {
  const systemPrompt = `You are a WhatsApp marketing expert. Write short, punchy, conversational WhatsApp messages 
that get responses from small business owners. Use emojis sparingly. Keep messages under 150 words. 
Be friendly but professional. Nigerian context.`;

  const userPrompt = `Write a WhatsApp outreach message for ${business.name}, a ${business.businessType.toLowerCase()} in ${business.city}, Nigeria.

Website status: ${business.websiteStatus === "none" ? "No website" : `${business.websiteStatus} website`}

The message should:
1. Be brief and engaging (under 150 words)
2. Mention that you help similar businesses grow
3. Highlight one specific benefit relevant to their situation
4. Ask if they would like to see examples
5. End with a friendly sign-off as [Your Name]

Format as a WhatsApp message (no subject line).`;

  const content = await callOpenAI(systemPrompt, userPrompt);

  return {
    type: "whatsapp_message",
    title: "AI WhatsApp Message",
    content,
  };
}

export async function generateAIColdCallScript(business: Business): Promise<AISalesTool> {
  const systemPrompt = `You are a sales training expert. Write detailed cold call scripts with clear sections, 
timing guidance, and objection handling. The script should feel natural and conversational, not robotic. 
Include tips for the caller. Nigerian business context.`;

  const userPrompt = `Write a complete cold call script for calling ${business.name}, a ${business.businessType.toLowerCase()} in ${business.city}, Nigeria.

Website status: ${business.websiteStatus === "none" ? "No website" : `${business.websiteStatus} website`}
Phone: ${business.phone}

Include:
1. Opening (15 seconds) - friendly greeting and hook
2. Value proposition (30 seconds) - tailored to their website status
3. Social proof (15 seconds) - mention helping similar businesses
4. Question/CTA (10 seconds) - ask for a brief meeting
5. Objection handling for common responses ("not interested", "too expensive", "send email")
6. Closing - thank you and next steps
7. Tips section for the caller

Format with clear headings and timing notes.`;

  const content = await callOpenAI(systemPrompt, userPrompt);

  return {
    type: "cold_call_script",
    title: "AI Cold Call Script",
    content,
  };
}

export async function generateAIFollowUp(business: Business): Promise<AISalesTool> {
  const systemPrompt = `You are a follow-up email specialist. Write polite but persistent follow-up emails 
that re-engage prospects without being pushy. Focus on adding value in each touch. Professional tone. 
Nigerian business context.`;

  const userPrompt = `Write a follow-up email for ${business.name}, a ${business.businessType.toLowerCase()} in ${business.city}, Nigeria.

This is a follow-up to a previous outreach about website/AI automation services.

The email should:
1. Have a compelling subject line
2. Reference the previous conversation (or assume they missed it)
3. Add new value - maybe a quick tip, stat, or insight relevant to their business type
4. Include a low-friction CTA (reply, short call, see a demo)
5. Keep it under 250 words
6. Sign as [Your Name] with placeholder contact details
7. Add a P.S. with a compelling stat or offer

Format as a professional email with subject line.`;

  const content = await callOpenAI(systemPrompt, userPrompt);

  return {
    type: "follow_up",
    title: "AI Follow-up Email",
    content,
  };
}

export async function generateAllAItools(business: Business): Promise<AISalesTool[]> {
  const [pitch, whatsapp, script, followup] = await Promise.all([
    generateAIWebsitePitch(business),
    generateAIWhatsAppMessage(business),
    generateAIColdCallScript(business),
    generateAIFollowUp(business),
  ]);

  return [pitch, whatsapp, script, followup];
}
