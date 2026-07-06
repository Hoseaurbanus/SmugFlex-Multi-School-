import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

export function TermsOfService() {
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
              <FileText className="w-6 h-6 text-[#FFD700]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
              <p className="text-white/60 text-sm">SmugFlex Ventures</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-500 text-sm mb-8">Last updated: July 4, 2026</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the SmugFlex platform ("Service"), you agree to be bound by these
            Terms of Service. If you are using the Service on behalf of a school, you represent
            that you have the authority to bind that school to these Terms.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            SmugFlex is a cloud-based school management platform that provides results management,
            CBT (Computer-Based Testing), fee collection, attendance tracking, student/teacher
            management, notifications, and reporting tools for educational institutions.
          </p>

          <h2>3. Account Registration</h2>
          <p>
            Schools must complete the registration process to access the Service. You agree to
            provide accurate, current, and complete information during registration. Each school
            is assigned a unique subdomain and administrator account upon approval.
          </p>

          <h2>4. Subscription and Payment</h2>
          <p>
            SmugFlex operates on a per-student, per-term pricing model. The first term is offered
            as a free trial. Subsequent terms require payment via Paystack integration. Prices are
            displayed in Nigerian Naira (₦) and may be updated with notice.
          </p>

          <h2>5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to other accounts or systems</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Upload malicious content or viruses</li>
            <li>Share login credentials with unauthorized parties</li>
          </ul>

          <h2>6. Data Ownership</h2>
          <p>
            Schools retain full ownership of all data entered into SmugFlex, including student
            records, results, and financial data. SmugFlex acts as a data processor and will not
            use school data for purposes other than providing the Service.
          </p>

          <h2>7. Intellectual Property</h2>
          <p>
            The SmugFlex platform, including its software, design, logos, and documentation, is the
            intellectual property of SmugFlex Ventures. You may not copy, modify, or distribute
            any part of the Service without written permission.
          </p>

          <h2>8. Service Availability</h2>
          <p>
            We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. Scheduled
            maintenance windows will be communicated in advance. We are not liable for data loss
            caused by force majeure events.
          </p>

          <h2>9. Limitation of Liability</h2>
          <p>
            SmugFlex Ventures shall not be liable for any indirect, incidental, special, consequential,
            or punitive damages arising from your use of the Service. Our total liability shall not
            exceed the amount paid by your school in the twelve months preceding the claim.
          </p>

          <h2>10. Termination</h2>
          <p>
            Either party may terminate this agreement. Schools may cancel their subscription at any
            time. SmugFlex reserves the right to suspend accounts that violate these Terms. Upon
            termination, data is retained for 90 days then permanently deleted.
          </p>

          <h2>11. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes
            shall be resolved in the courts of competent jurisdiction in Lagos, Nigeria.
          </p>

          <h2>12. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Material changes will be
            communicated via email or through the platform at least 30 days before they take effect.
          </p>

          <h2>13. Contact</h2>
          <p>
            For questions about these Terms, contact us at:<br />
            <strong>Email:</strong> smugflexventures@gmail.com<br />
            <strong>WhatsApp:</strong> +234 903 003 1278
          </p>
        </div>
      </div>
    </div>
  );
}
