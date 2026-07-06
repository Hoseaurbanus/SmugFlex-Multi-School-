import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0A2540] py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#FFD700]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
              <p className="text-white/60 text-sm">SmugFlex Ventures</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-500 text-sm mb-8">Last updated: July 4, 2026</p>

          <h2>1. Introduction</h2>
          <p>
            SmugFlex Ventures ("we," "our," or "us") operates the SmugFlex school management platform.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information
            when you use our platform, website, and related services.
          </p>

          <h2>2. Information We Collect</h2>
          <p><strong>Account Information:</strong> When a school registers, we collect school name, administrator
            name, email address, phone number, and school address.</p>
          <p><strong>Student Data:</strong> Schools input student information including names, class assignments,
            attendance records, and academic results.</p>
          <p><strong>Usage Data:</strong> We automatically collect device information, IP addresses, browser type,
            and platform usage patterns.</p>

          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To provide, maintain, and improve the SmugFlex platform</li>
            <li>To process school registrations and manage accounts</li>
            <li>To generate academic reports, results, and analytics</li>
            <li>To communicate with schools about their accounts and support</li>
            <li>To ensure platform security and prevent fraud</li>
          </ul>

          <h2>4. Data Sharing</h2>
          <p>
            We do not sell or rent personal information to third parties. Student and school data is
            accessible only to authorized users within the school's account. We may share data only
            when required by law or to protect the rights and safety of SmugFlex, our users, or the public.
          </p>

          <h2>5. Data Security</h2>
          <p>
            We implement industry-standard security measures including encrypted connections (HTTPS),
            secure password hashing (bcrypt), role-based access controls, and regular security audits.
            However, no method of electronic transmission is 100% secure.
          </p>

          <h2>6. Data Retention</h2>
          <p>
            School and student data is retained as long as the school maintains an active subscription.
            Upon account deletion, data is purged within 90 days, except where retention is required by law.
          </p>

          <h2>7. Your Rights</h2>
          <p>Schools and their authorized administrators have the right to:</p>
          <ul>
            <li>Access all data stored within their SmugFlex account</li>
            <li>Correct inaccurate information</li>
            <li>Export student data in standard formats</li>
            <li>Request deletion of their account and associated data</li>
          </ul>

          <h2>8. Cookies</h2>
          <p>
            SmugFlex uses essential cookies for authentication and session management. We do not use
            third-party advertising cookies.
          </p>

          <h2>9. Children's Privacy</h2>
          <p>
            SmugFlex is used by schools to manage student data under the authority of the school
            administration. We do not collect personal information directly from students.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify schools of any
            material changes via email or through the platform.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            For questions about this Privacy Policy, contact us at:<br />
            <strong>Email:</strong> smugflexventures@gmail.com<br />
            <strong>WhatsApp:</strong> +234 903 003 1278
          </p>
        </div>
      </div>
    </div>
  );
}
