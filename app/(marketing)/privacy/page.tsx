export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <p className="text-muted-foreground">Last updated: July 24, 2026</p>

        <h2 className="text-xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
        <p>We collect your email, name, and usage data when you create an account. We also store your saved leads, search history, and notes.</p>

        <h2 className="text-xl font-semibold mt-8 mb-4">2. How We Use Your Data</h2>
        <p>Your data is used to provide the service, personalize your experience, and improve our AI tools. We do not sell your personal information.</p>

        <h2 className="text-xl font-semibold mt-8 mb-4">3. Data Storage</h2>
        <p>All data is stored securely using Supabase with Row Level Security. Business data is sourced from public directories.</p>

        <h2 className="text-xl font-semibold mt-8 mb-4">4. Cookies</h2>
        <p>We use essential cookies for authentication and session management. We do not use tracking cookies for advertising.</p>

        <h2 className="text-xl font-semibold mt-8 mb-4">5. Third Parties</h2>
        <p>We use Google Maps API for location data and OpenAI for AI generation. These services have their own privacy policies.</p>

        <h2 className="text-xl font-semibold mt-8 mb-4">6. Your Rights</h2>
        <p>You can access, update, or delete your account data at any time from your settings page.</p>

        <h2 className="text-xl font-semibold mt-8 mb-4">7. Contact</h2>
        <p>For privacy concerns, contact us at privacy@leadpilot.ai</p>
      </div>
    </div>
  );
}
