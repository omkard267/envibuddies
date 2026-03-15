import React from "react";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import PolicyPageLayout, { PolicySection } from "../components/layout/PolicyPageLayout";

const LAST_UPDATED = "Feb 22, 2025";

const SECTIONS = [
  { id: "acceptance", label: "Acceptance" },
  { id: "eligibility", label: "Eligibility & accounts" },
  { id: "use", label: "Use of the platform" },
  { id: "content", label: "Events & content" },
  { id: "payments", label: "Sponsorships & payments" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Liability" },
  { id: "termination", label: "Changes & termination" },
  { id: "contact", label: "Contact" },
];

const KEY_POINTS = [
  "Use the platform lawfully and in line with our mission (volunteers + environment).",
  "You’re responsible for your account and content; organizers are responsible for their events.",
  "We provide the platform “as is”; participation in events is at your own risk.",
];

export default function TermsOfServicePage() {
  return (
    <PolicyPageLayout
      title="Terms of Service"
      subtitle="The rules of the road for using EnviBuddies."
      lastUpdated={LAST_UPDATED}
      icon={DocumentTextIcon}
      keyPoints={KEY_POINTS}
      sections={SECTIONS}
    >
      <PolicySection
        id="acceptance"
        title="Acceptance"
        inShort="By using EnviBuddies, you agree to these terms. If you’re using it for an organization, you have authority to bind them."
        defaultOpen
      >
        <p>By accessing or using EnviBuddies, you agree to these Terms. We connect volunteers with environmental organizations and events; use must be lawful and aligned with that mission.</p>
      </PolicySection>

      <PolicySection
        id="eligibility"
        title="Eligibility & accounts"
        inShort="You must be at least 13 (or age of consent where you live). You’re responsible for keeping your account secure and your info accurate."
      >
        <ul className="list-disc pl-5 space-y-1">
          <li>You must be at least 13 (or the age of consent in your jurisdiction).</li>
          <li>You’re responsible for your account and all activity under it.</li>
          <li>Keep your information accurate and up to date.</li>
          <li>We may suspend or terminate accounts that break these terms or that we reasonably believe are fraudulent or harmful.</li>
        </ul>
      </PolicySection>

      <PolicySection
        id="use"
        title="Use of the platform"
        inShort="Use it to browse events, volunteer, organize, and manage sponsorships. Don’t break the law, impersonate others, or abuse the platform."
      >
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Break any applicable laws or violate third-party rights</li>
          <li>Impersonate others or give false information</li>
          <li>Upload malware, spam, or harmful or infringing content</li>
          <li>Scrape, reverse-engineer, or overload our systems without permission</li>
          <li>Resell or misuse access in ways we haven’t allowed</li>
        </ul>
      </PolicySection>

      <PolicySection
        id="content"
        title="Events & content"
        inShort="Organizers are responsible for event accuracy and safety. You own your content but grant us a license to use it to run and promote the platform."
      >
        <p>Organizers are responsible for event details, safety at events, and local laws. You own your content but grant us a license to use it to operate and promote EnviBuddies. We may remove content that violates these terms.</p>
      </PolicySection>

      <PolicySection
        id="payments"
        title="Sponsorships & payments"
        inShort="Sponsorship applications and payments follow our payment processor’s policies. Refunds and disputes are handled per our policies and applicable law."
      >
        <p>Sponsorship applications and payments are subject to our payment processor’s terms. Refunds and disputes follow our payment and sponsorship policies and applicable law. We don’t guarantee approval of any application.</p>
      </PolicySection>

      <PolicySection
        id="disclaimers"
        title="Disclaimers"
        inShort="The platform is provided “as is.” We don’t guarantee uptime. We’re not liable for user or organizer conduct or for events off the platform."
      >
        <p>The platform is provided “as is” and “as available.” We don’t guarantee uninterrupted or error-free service. We’re not liable for the conduct of users, organizers, or third parties, or for events held off the platform. Volunteering and event participation are at your own risk.</p>
      </PolicySection>

      <PolicySection
        id="liability"
        title="Liability"
        inShort="To the max allowed by law, we’re not liable for indirect or consequential damages. Our total liability is limited to what you paid us in the last 12 months (if any)."
      >
        <p>To the maximum extent permitted by law, EnviBuddies is not liable for indirect, incidental, special, or consequential damages. Our total liability shall not exceed the amount you paid us in the 12 months before the claim (if any).</p>
      </PolicySection>

      <PolicySection
        id="termination"
        title="Changes & termination"
        inShort="We may change these terms; continued use = acceptance. We may suspend or terminate access; you can close your account anytime."
      >
        <p>We may update these terms; continued use means you accept the changes. We may suspend or terminate your access for breach or other reasons. You can close your account anytime. Terms that should survive (e.g. disclaimers, liability limits) will survive.</p>
      </PolicySection>

      <PolicySection
        id="contact"
        title="Contact"
        inShort="Questions? support@envibuddies.me. Governing law and dispute resolution depend on your jurisdiction."
      >
        <p>For questions about these Terms: <strong>support@envibuddies.me</strong>. Governing law and dispute resolution are as specified for your jurisdiction.</p>
      </PolicySection>
    </PolicyPageLayout>
  );
}
