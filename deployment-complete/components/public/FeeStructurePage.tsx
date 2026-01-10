import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { ArrowLeft } from "lucide-react";

interface FeeStructurePageProps {
  onBack: () => void;
}

export function FeeStructurePage({ onBack }: FeeStructurePageProps) {
  const primaryFees = [
    { class: "Primary 1", tuition: 150000, development: 30000, pta: 5000, exam: 10000, total: 195000 },
    { class: "Primary 2", tuition: 150000, development: 30000, pta: 5000, exam: 10000, total: 195000 },
    { class: "Primary 3", tuition: 155000, development: 30000, pta: 5000, exam: 10000, total: 200000 },
    { class: "Primary 4", tuition: 155000, development: 30000, pta: 5000, exam: 10000, total: 200000 },
    { class: "Primary 5", tuition: 160000, development: 30000, pta: 5000, exam: 15000, total: 210000 },
    { class: "Primary 6", tuition: 160000, development: 30000, pta: 5000, exam: 15000, total: 210000 }
  ];

  const secondaryFees = [
    { class: "JSS 1", tuition: 180000, development: 35000, pta: 5000, exam: 15000, total: 235000 },
    { class: "JSS 2", tuition: 180000, development: 35000, pta: 5000, exam: 15000, total: 235000 },
    { class: "JSS 3", tuition: 185000, development: 35000, pta: 5000, exam: 20000, total: 245000 },
    { class: "SS 1", tuition: 200000, development: 40000, pta: 5000, exam: 20000, total: 265000 },
    { class: "SS 2", tuition: 200000, development: 40000, pta: 5000, exam: 20000, total: 265000 },
    { class: "SS 3", tuition: 210000, development: 40000, pta: 5000, exam: 25000, total: 280000 }
  ];

  const formatCurrency = (amount: number) => {
    return `\u20A6${amount.toLocaleString()}`;
  };

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
          <h1 className="text-3xl mb-2">Fee Structure 2024/2025</h1>
          <p className="text-blue-100">Transparent and affordable quality education</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Important Notice */}
        <Card className="rounded-xl border-none shadow-md mb-8 bg-gradient-to-r from-blue-50 to-green-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-500 p-3 rounded-full">
                <span className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl mb-2">Fee Payment Information</h2>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Fees are payable per term (3 terms per academic session)</li>
                  <li>• 10% discount for full session payment</li>
                  <li>• Payment deadline: 2 weeks after resumption</li>
                  <li>• Late payment attracts \u20A65,000 penalty</li>
                  <li>• All fees are non-refundable except in special cases</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary Section Fees */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Primary Section (Primary 1-6)</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Per Term Fee Structure</p>
              </div>
              <Badge className="bg-[#2563EB]">Primary</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Tuition Fee</TableHead>
                    <TableHead>Development</TableHead>
                    <TableHead>PTA Levy</TableHead>
                    <TableHead>Exam Fee</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {primaryFees.map((fee) => (
                    <TableRow key={fee.class}>
                      <TableCell>{fee.class}</TableCell>
                      <TableCell>{formatCurrency(fee.tuition)}</TableCell>
                      <TableCell>{formatCurrency(fee.development)}</TableCell>
                      <TableCell>{formatCurrency(fee.pta)}</TableCell>
                      <TableCell>{formatCurrency(fee.exam)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(fee.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Section Fees */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Secondary Section (JSS 1 - SS 3)</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Per Term Fee Structure</p>
              </div>
              <Badge className="bg-[#10B981]">Secondary</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Tuition Fee</TableHead>
                    <TableHead>Development</TableHead>
                    <TableHead>PTA Levy</TableHead>
                    <TableHead>Exam Fee</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {secondaryFees.map((fee) => (
                    <TableRow key={fee.class}>
                      <TableCell>{fee.class}</TableCell>
                      <TableCell>{formatCurrency(fee.tuition)}</TableCell>
                      <TableCell>{formatCurrency(fee.development)}</TableCell>
                      <TableCell>{formatCurrency(fee.pta)}</TableCell>
                      <TableCell>{formatCurrency(fee.exam)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(fee.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Additional Fees */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="rounded-xl border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">One-Time Fees (New Students)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Registration Fee</span>
                  <span>{formatCurrency(20000)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Admission Form</span>
                  <span>{formatCurrency(5000)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Acceptance Fee</span>
                  <span>{formatCurrency(30000)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Uniform (Complete Set)</span>
                  <span>{formatCurrency(25000)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Textbooks (Estimated)</span>
                  <span>{formatCurrency(35000)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Optional Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">School Bus (Per Term)</span>
                  <span>{formatCurrency(40000)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Lunch Program (Per Term)</span>
                  <span>{formatCurrency(30000)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">After-School Care (Per Term)</span>
                  <span>{formatCurrency(25000)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Music Lessons (Per Term)</span>
                  <span>{formatCurrency(15000)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Extra Lessons (Per Term)</span>
                  <span>{formatCurrency(20000)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="h-5 w-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="border rounded-lg p-4">
                <h3 className="mb-3">Bank Transfer</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>Bank:</strong> Bank details to be provided by school administration</p>
                  <p><strong>Account Name:</strong> Please contact school for account information</p>
                  <p><strong>Account Number:</strong> Available from school administration</p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="mb-3">Cash Payment</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>Pay at school accounts office</p>
                  <p><strong>Hours:</strong> 8:00 AM - 3:00 PM</p>
                  <p><strong>Days:</strong> Monday - Friday</p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="mb-3">Online Payment</h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>Through parent portal</p>
                  <p><strong>Methods:</strong> Card, USSD, Transfer</p>
                  <p><strong>Fee:</strong> Transaction charges apply</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scholarship Information */}
        <Card className="rounded-xl border-none shadow-md">
          <CardHeader>
            <CardTitle>Scholarship & Financial Aid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none text-gray-600">
              <p className="mb-4">
                Graceland Royal Academy is committed to making quality education accessible.
                We offer various scholarship and financial aid options:
              </p>
              <ul className="space-y-2 mb-4">
                <li><strong>Merit Scholarship:</strong> Up to 50% tuition waiver for outstanding academic performance</li>
                <li><strong>Sports Scholarship:</strong> For students with exceptional athletic abilities</li>
                <li><strong>Need-Based Aid:</strong> Financial assistance for families facing hardship</li>
                <li><strong>Sibling Discount:</strong> 10% discount for families with multiple children enrolled</li>
              </ul>
              <div className="flex gap-4">
                <Button className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                  <span className="mr-2 h-4 w-4" />
                  Download Fee Schedule
                </Button>
                <Button variant="outline">
                  Apply for Scholarship
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
