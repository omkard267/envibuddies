import React from "react";
import { CircleStackIcon } from "@heroicons/react/24/outline";
import PolicyPageLayout, { PolicySection } from "../components/layout/PolicyPageLayout";

const LAST_UPDATED = "Feb 22, 2025";

const SECTIONS = [
  { id: "what", label: "What are cookies?" },
  { id: "types", label: "Types we use" },
  { id: "local", label: "Local storage" },
  { id: "third-party", label: "Third-party cookies" },
  { id: "choices", label: "Your choices" },
  { id: "updates", label: "Updates" },
];

const KEY_POINTS = [
  "We use cookies and similar tech to keep you logged in, remember preferences, and improve the product.",
  "Necessary cookies can’t be turned off if you want to use the site; you can control others in your browser.",
  "Third-party services (e.g. Google, payments) have their own cookie policies.",
];

export default function CookiePolicyPage() {
  return (
    <PolicyPageLayout
      title="Cookie Policy"
      subtitle="How we use cookies and similar tech—short and clear."
      lastUpdated={LAST_UPDATED}
      icon={CircleStackIcon}
      keyPoints={KEY_POINTS}
      sections={SECTIONS}
    >
      <PolicySection
        id="what"
        title="What are cookies?"
        inShort="Small text files that help the site remember you, keep you logged in, and understand how the site is used."
        defaultOpen
      >
        <p>Cookies are small text files stored on your device when you visit a site. They help us remember your preferences, keep you signed in, and understand usage so we can improve. We also use similar tech like local and session storage.</p>
      </PolicySection>

      <PolicySection
        id="types"
        title="Types we use"
        inShort="Necessary (required), functional (preferences), analytics (improvement), and—where we use them—marketing (with consent)."
      >
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Strictly necessary:</strong> Auth, security, load balancing—needed for the site to work. Can’t be disabled if you want to use the platform.</li>
          <li><strong>Functional:</strong> Remember your choices (e.g. language, theme).</li>
          <li><strong>Analytics & performance:</strong> How visitors use the site so we can improve.</li>
          <li><strong>Marketing (if any):</strong> Only with your consent or where the law allows.</li>
        </ul>
      </PolicySection>

      <PolicySection
        id="local"
        title="Local storage"
        inShort="We also use browser storage for things like keeping you logged in and saving chat history on your device."
      >
        <p>We use browser local and session storage for login state, per-user chat history, and UI preferences. This data stays on your device and isn’t sent to third parties except as described in our Privacy Policy (e.g. analytics).</p>
      </PolicySection>

      <PolicySection
        id="third-party"
        title="Third-party cookies"
        inShort="Services like Google Sign-In and payment providers may set their own cookies—governed by their policies."
      >
        <p>Third-party services we use (e.g. Google Sign-In, analytics, payments) may set their own cookies. Their use is governed by their privacy and cookie policies—worth a look if you want the full picture.</p>
      </PolicySection>

      <PolicySection
        id="choices"
        title="Your choices"
        inShort="Control or delete cookies in your browser. Blocking some may affect how the site works (e.g. you may need to log in again)."
      >
        <p>You can control or delete cookies in your browser settings. Blocking or deleting some cookies may affect functionality (e.g. you might need to log in again). Where we use non-essential cookies that need consent, we’ll ask in line with applicable law.</p>
      </PolicySection>

      <PolicySection
        id="updates"
        title="Updates"
        inShort="We may update this policy; the “Updated” date at the top will change. Check back from time to time."
      >
        <p>We may update this Cookie Policy to reflect changes in our practices or the law. The “Updated” date at the top will change. For how we process personal data overall, see our <strong>Privacy Policy</strong>. Questions: <strong>support@envibuddies.me</strong>.</p>
      </PolicySection>
    </PolicyPageLayout>
  );
}
