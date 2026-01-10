import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { ArrowLeft } from "lucide-react";

interface AdmissionsPageProps {
  onBack: () => void;
}

export function AdmissionsPage({ onBack }: AdmissionsPageProps) {
  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Header */}
      <header className="bg-[#2563EB] text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-3xl mb-2">Admissions Information</h1>
          <p className="text-blue-100">Join the Graceland Royal Academy Family</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Admission Status */}
        <Card className="rounded-xl border-none shadow-md mb-8 bg-gradient-to-r from-green-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-500 p-3 rounded-full">
                <span className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl mb-1">Admissions Now Open!</h2>
                <p className="text-gray-600">
                  We are currently accepting applications for the 2025/2026 Academic Session
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Programs */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardHeader>
            <CardTitle>Available Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <Badge className="bg-[#2563EB] mb-3">Primary Section</Badge>
                <h3 className="mb-2">Primary 1 - 6</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Strong foundation in literacy, numeracy, and character development
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Ages 6-12</li>
                  <li>• Nigerian curriculum (NERDC)</li>
                  <li>• Focus on basic education</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <Badge className="bg-[#10B981] mb-3">Secondary Section</Badge>
                <h3 className="mb-2">JSS 1 - SS 3</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Comprehensive secondary education preparing students for excellence
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Ages 12-18</li>
                  <li>• WAEC/NECO preparation</li>
                  <li>• Science & Arts tracks</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admission Process */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardHeader>
            <CardTitle>Admission Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 rounded-full p-2 mt-1">
                  <span className="text-[#2563EB] font-bold">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="mb-1">Purchase Admission Form</h3>
                  <p className="text-sm text-gray-600">
                    Visit the school or purchase form online. Form fee: \u20A65,000 (non-refundable)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-blue-100 rounded-full p-2 mt-1">
                  <span className="text-[#2563EB] font-bold">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="mb-1">Complete Application Form</h3>
                  <p className="text-sm text-gray-600">
                    Fill out the form accurately with all required information and attach necessary documents
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-blue-100 rounded-full p-2 mt-1">
                  <span className="text-[#2563EB] font-bold">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="mb-1">Submit Application</h3>
                  <p className="text-sm text-gray-600">
                    Submit completed form with all required documents to the school office
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-blue-100 rounded-full p-2 mt-1">
                  <span className="text-[#2563EB] font-bold">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="mb-1">Entrance Examination</h3>
                  <p className="text-sm text-gray-600">
                    Take entrance examination (for JSS 1 and above). Date will be communicated
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-blue-100 rounded-full p-2 mt-1">
                  <span className="text-[#2563EB] font-bold">5</span>
                </div>
                <div className="flex-1">
                  <h3 className="mb-1">Interview</h3>
                  <p className="text-sm text-gray-600">
                    Parent and student interview with the Principal or Vice Principal
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-green-100 rounded-full p-2 mt-1">
                  <span className="text-[#10B981] font-bold">6</span>
                </div>
                <div className="flex-1">
                  <h3 className="mb-1">Admission Decision</h3>
                  <p className="text-sm text-gray-600">
                    Receive admission letter and complete registration by paying acceptance fee
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Required Documents */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="h-5 w-5" />
              Required Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="mb-3">For All Applicants:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="h-4 w-4 text-[#10B981] mt-0.5" />
                    Birth certificate or age declaration
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-4 w-4 text-[#10B981] mt-0.5" />
                    Four recent passport photographs
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-4 w-4 text-[#10B981] mt-0.5" />
                    Photocopy of parent's ID card
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-4 w-4 text-[#10B981] mt-0.5" />
                    Medical certificate of fitness
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3">For Transfer Students:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="h-4 w-4 text-[#10B981] mt-0.5" />
                    Transfer certificate from previous school
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-4 w-4 text-[#10B981] mt-0.5" />
                    Last term's report card
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-4 w-4 text-[#10B981] mt-0.5" />
                    Letter of recommendation (if applicable)
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Dates */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="h-5 w-5" />
              Important Dates 2025/2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Application Opens</span>
                <Badge variant="outline">January 15, 2025</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Application Closes</span>
                <Badge variant="outline">August 31, 2025</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Entrance Exam (Batch 1)</span>
                <Badge variant="outline">March 15, 2025</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Entrance Exam (Batch 2)</span>
                <Badge variant="outline">June 20, 2025</Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Session Begins</span>
                <Badge className="bg-[#10B981]">September 15, 2025</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact for Admission */}
        <Card className="rounded-xl border-none shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="h-5 w-5" />
              Contact Admissions Office
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="mb-3">Visit Us</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Graceland Royal Academy<br />
                  123 Education Avenue<br />
                  Gombe, Gombe State<br />
                  Nigeria
                </p>
              </div>

              <div>
                <h3 className="mb-3">Contact Information</h3>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Phone:</strong> +234 803 456 7890
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Email:</strong> admissions@gracelandgombe.edu.ng
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Office Hours:</strong> Mon-Fri, 8:00 AM - 4:00 PM
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <Button className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                <span className="mr-2 h-4 w-4" />
                Download Application Form
              </Button>
              <Button variant="outline">
                Contact Admissions Office
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
