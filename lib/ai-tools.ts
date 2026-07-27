import { AISalesTool, Business } from "@/types";

export function generateWebsitePitch(business: Business): AISalesTool {
  const hasWebsite = business.websiteStatus !== "none";

  let content = "";

  if (!hasWebsite) {
    content = `Hi ${business.name} Team,

I hope this message finds you well. I came across your business and was impressed by what you're doing in the ${business.businessType.toLowerCase()} industry.

I noticed that ${business.name} doesn't currently have a website. In today's digital-first world, having a professional online presence is essential for:

• Attracting new customers searching online
• Building credibility and trust with potential clients
• Showcasing your services, menu, or products 24/7
• Competing effectively with other ${business.businessType.toLowerCase()}s in ${business.city}

I'd love to offer you a **modern, mobile-friendly website** starting at an affordable rate. Our websites are:

✓ Optimized for Google search (SEO-ready)
✓ Mobile-responsive for customers on smartphones
✓ Fast-loading and secure
✓ Easy to update yourself

Would you be open to a quick 10-minute call to discuss how a website could help ${business.name} grow?

Best regards,
[Your Name]`;
  } else if (business.websiteStatus === "outdated") {
    content = `Hi ${business.name} Team,

I visited your current website and appreciate the foundation you've built. However, I noticed some opportunities to significantly improve your online presence.

A modern website redesign could help ${business.name}:

• **Load faster** – Slow sites lose 53% of mobile visitors
• **Rank higher on Google** – Modern SEO practices boost visibility
• **Look professional on all devices** – Over 70% of browsing happens on mobile
• **Convert more visitors** – Better design = more calls and bookings

We specialize in transforming outdated websites into powerful business tools that actually generate leads and revenue.

I'd love to show you a free preview of what your new website could look like. Would you have 15 minutes this week for a quick conversation?

Best regards,
[Your Name]`;
  } else {
    content = `Hi ${business.name} Team,

Your website looks great! I can see you've invested in your online presence. Now, let me ask you:

**Are you maximizing its potential?**

Many businesses with good websites miss out on:

• **AI-powered chatbots** – Answer customer questions 24/7, even while you sleep
• **WhatsApp integration** – Let customers book or order directly via chat
• **Automation** – Reduce repetitive tasks and focus on growing your business
• **Lead capture optimization** – Turn more visitors into paying customers

We help ${business.businessType.toLowerCase()}s like yours implement smart automation that saves time and increases revenue.

Would you be interested in a free audit of your current setup? I'll share 3 quick wins you can implement immediately.

Best regards,
[Your Name]`;
  }

  return {
    type: "website_pitch",
    title: "Website Sales Pitch",
    content,
  };
}

export function generateWhatsAppMessage(business: Business): AISalesTool {
  const hasWebsite = business.websiteStatus !== "none";

  let content = "";

  if (!hasWebsite) {
    content = `Hello ${business.name}! 👋

My name is [Your Name], and I help ${business.businessType.toLowerCase()}s in ${business.city} grow their customer base through smart digital solutions.

I noticed you don't have a website yet. Did you know that **60% of customers** search online before visiting a business? 

I can build you a professional website that:
✅ Shows up on Google
✅ Works perfectly on phones
✅ Helps customers find you easily

Would you like to see some examples of websites I've built for similar businesses?

Best,
[Your Name]`;
  } else if (business.websiteStatus === "outdated") {
    content = `Hi ${business.name}! 👋

I came across your business and checked out your website. Love what you're doing! 

I did notice the site could use some updates to better serve your customers. A fresh, modern website can:

📱 Work better on mobile phones
⚡ Load much faster
🔍 Show up higher on Google
💰 Bring in more customers

I help businesses like yours upgrade their online presence affordably. Interested in a free consultation?

[Your Name]`;
  } else {
    content = `Hi ${business.name}! 👋

Great website! I can see you value your online presence. 

Quick question: Are you using **WhatsApp AI chatbots** to handle customer inquiries automatically?

Imagine if customers could:
• Book appointments via WhatsApp 24/7
• Get instant answers to common questions
• Receive automatic follow-ups

All while you focus on running your business. I can set this up for you in just a few days.

Want to see a demo?

[Your Name]`;
  }

  return {
    type: "whatsapp_message",
    title: "WhatsApp Outreach Message",
    content,
  };
}

export function generateColdCallScript(business: Business): AISalesTool {
  const hasWebsite = business.websiteStatus !== "none";

  let hook = "";
  let pitch = "";

  if (!hasWebsite) {
    hook = `I noticed that ${business.name} doesn't have a website yet, and I wanted to reach out because I think you're missing out on a lot of potential customers.`;
    pitch = `Every day, people in ${business.city} are searching online for ${business.businessType.toLowerCase()}s like yours. Without a website, those customers are going to your competitors. I can help you build a professional website that brings in new customers 24/7.`;
  } else if (business.websiteStatus === "outdated") {
    hook = `I visited your website and I love what ${business.name} offers. I did notice the site looks a bit dated, and I wanted to share how a redesign could help you get more customers.`;
    pitch = `A modern website loads faster, ranks higher on Google, and converts more visitors into paying customers. I specialize in helping ${business.businessType.toLowerCase()}s upgrade their online presence affordably.`;
  } else {
    hook = `I came across ${business.name}'s website and I'm impressed by your online presence. I wanted to reach out because I help businesses like yours take the next step with AI automation.`;
    pitch = `You already have a great website. Now imagine if you could automatically answer customer questions, book appointments, and follow up with leads — all through WhatsApp and AI. It saves you hours every week while increasing revenue.`;
  }

  const content = `**COLD CALL SCRIPT – ${business.name}**

**Opening (15 seconds):**
"Hi, this is [Your Name] from [Your Company]. Am I speaking with the owner or manager? Great! ${hook}"

**Value Proposition (30 seconds):**
"${pitch}"

**Social Proof (15 seconds):**
"I recently helped a ${business.businessType.toLowerCase()} in ${business.city} increase their online inquiries by 40% in just the first month."

**Question (10 seconds):**
"Do you have 10 minutes this week for a quick call where I can show you exactly how this would work for ${business.name}?"

**If Interested:**
"Great! Would Tuesday at 2 PM or Thursday at 10 AM work better for you?"

**If Not Interested:**
"I understand. Would it be okay if I sent you a quick email with some examples of what I've done for similar businesses? No pressure at all."

**Closing:**
"Thank you for your time, and I look forward to helping ${business.name} grow!"

---

**Tips:**
• Smile while talking — it comes through in your voice
• Stand up — it gives you more energy and confidence
• Have a pen and paper ready to take notes
• Don't take rejection personally — it's a numbers game`;

  return {
    type: "cold_call_script",
    title: "Cold Call Script",
    content,
  };
}

export function generateFollowUpMessage(business: Business): AISalesTool {
  const content = `Subject: Quick follow-up – ${business.name} Digital Growth

Hi there,

I hope you're doing well! I wanted to follow up on my previous message about helping ${business.name} enhance its digital presence.

I know you're busy running a successful ${business.businessType.toLowerCase()}, so I'll keep this brief:

**What I can do for you:**
• Build or upgrade your website to attract more customers
• Set up AI automation to handle inquiries 24/7
• Create a WhatsApp chatbot for instant customer engagement
• Optimize your Google presence so locals find you first

**Why now?**
Your competitors are already investing in these tools. Every day without them is a missed opportunity.

**No risk:**
I'm happy to provide a free consultation and show you exactly what your improved presence could look like — no commitment required.

Would you be open to a 10-minute call this week? Just reply with a time that works for you.

Best regards,
[Your Name]
[Your Phone Number]
[Your Website]

---

**P.S.** — I recently helped a ${business.businessType.toLowerCase()} in ${business.city} increase their monthly customer inquiries by 35%. I'd love to share how we did it.`;

  return {
    type: "follow_up",
    title: "Follow-up Email",
    content,
  };
}

export function generateAllSalesTools(business: Business): AISalesTool[] {
  return [
    generateWebsitePitch(business),
    generateWhatsAppMessage(business),
    generateColdCallScript(business),
    generateFollowUpMessage(business),
  ];
}
