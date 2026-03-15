import React from "react";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import PolicyPageLayout, { PolicySection } from "../components/layout/PolicyPageLayout";

const LAST_UPDATED = "Feb 22, 2025";

const SECTIONS = [
  { id: "intro", label: "Introduction" },
  { id: "what-we-collect", label: "What we collect" },
  { id: "how-we-use", label: "How we use it" },
  { id: "sharing", label: "Sharing & disclosure" },
  { id: "security", label: "Security & retention" },
  { id: "your-rights", label: "Your rights" },
  { id: "changes", label: "Changes" },
];

const KEY_POINTS = [
  "We don’t sell your data. Ever.",
  "We use your info to run the platform, send event reminders, and improve the product.",
  "You can update or delete your data from your account; contact us for more.",
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPageLayout
      title="Privacy Policy"
      subtitle="How we handle your data—plain and simple."
      lastUpdated={LAST_UPDATED}
      icon={ShieldCheckIcon}
      keyPoints={KEY_POINTS}
      sections={SECTIONS}
    >
      <PolicySection
        id="intro"
        title="Introduction"
        inShort="By using EnviBuddies, you agree to how we collect and use your information as described here."
        defaultOpen
      >
        <p>
          EnviBuddies helps you discover environmental events, volunteer, and connect with organizations. This policy explains what data we collect, why, and how you can control it. If you don’t agree, please don’t use our services.
        </p>
      </PolicySection>

      <PolicySection
        id="what-we-collect"
        title="What we collect"
        inShort="What you give us, what we get automatically, and what we get from third parties (e.g. Google Sign-In)."
      >
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account:</strong> Name, email, profile photo, role (volunteer / organizer / sponsor).</li>
          <li><strong>Organization:</strong> Name, description, documents, contacts—when you register as an organizer.</li>
          <li><strong>Events:</strong> Events you create, events you join, attendance, certificates.</li>
          <li><strong>Sponsorship & payments:</strong> Application and payment-related details.</li>
          <li><strong>Usage:</strong> IP, browser, pages visited—to improve the product.</li>
        </ul>
      </PolicySection>

      <PolicySection
        id="how-we-use"
        title="How we use it"
        inShort="To run the platform, personalize your experience, send reminders and certificates, and improve our services. We do not sell your data."
      >
        <p>We use your information to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Run and secure the platform</li>
          <li>Personalize your experience</li>
          <li>Process events and sponsorships</li>
          <li>Send notifications (e.g. event reminders, certificates)</li>
          <li>Improve our services and fix issues</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p className="pt-2 font-medium text-slate-700">We do not sell your personal data to third parties.</p>
      </PolicySection>

      <PolicySection
        id="sharing"
        title="Sharing & disclosure"
        inShort="We share only with service providers (under strict agreements), event partners when relevant, and when the law requires it."
      >
        <p>We may share data with:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Service providers</strong> (hosting, analytics, email, payments) under strict agreements</li>
          <li><strong>Event organizers & organizations</strong> in the context of events you join or create</li>
          <li><strong>Authorities</strong> when required by law or to protect rights and safety</li>
        </ul>
      </PolicySection>

      <PolicySection
        id="security"
        title="Security & retention"
        inShort="We keep your data as long as your account is active or as needed for legal reasons. We use industry-standard security—but no internet transmission is 100% secure."
      >
        <p>We retain data while your account is active and as needed for legal or operational reasons. We use industry-standard security measures; no method of transmission over the internet is 100% secure.</p>
      </PolicySection>

      <PolicySection
        id="your-rights"
        title="Your rights"
        inShort="You can access, correct, delete, or port your data. Update your profile in settings or contact us."
      >
        <p>Depending on where you live, you may have rights to access, correct, delete, or port your data. You can update your profile and preferences in account settings. For other requests: <strong>support@envibuddies.me</strong>.</p>
      </PolicySection>

      <PolicySection
        id="changes"
        title="Changes"
        inShort="We may update this policy; we’ll notify you of big changes by email or on the platform."
      >
        <p>We may update this policy from time to time. We’ll notify you of material changes via email or a notice on the platform. The “Updated” date at the top reflects the latest version.</p>
      </PolicySection>
    </PolicyPageLayout>
  );
}
