import { School, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { useState } from "react";

interface ResultDetailProps {
  onBack: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
  resultData: {
    class: string;
    session: string;
    term: string;
    student: {
      name: string;
      admissionNumber: string;
      photo: string;
    };
    subjects: Array<{
      subject: string;
      test1: number;
      test2: number;
      exam: number;
      total: number;
      grade: string;
      position: string;
      teacher: string;
    }>;
    affective: {
      punctuality: number;
      neatness: number;
      politeness: number;
      honesty: number;
      relationship: number;
    };
    psychomotor: {
      handwriting: number;
      sports: number;
      tools: number;
      drawing: number;
      musical: number;
    };
    totalScore: number;
    average: number;
    position: string;
    classSize: number;
    teacherComment: string;
    status: "pending" | "approved" | "published";
  };
}

export function ResultApprovalDetailPage({ onBack, onApprove, onReject, onPublish, resultData }: ResultDetailProps) {
  const [principalComment, setPrincipalComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = () => {
    if (!principalComment) {
      toast.error("Please add Principal's comment before approving");
      return;
    }
    onApprove();
    toast.success("Result approved successfully!");
  };

  const handleReject = () => {
    if (!rejectionReason) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    onReject();
    toast.success("Result rejected. Class teacher will be notified.");
  };

  const handlePublish = () => {
    if (resultData.status !== "approved") {
      toast.error("Please approve the result before publishing");
      return;
    }
    onPublish();
    toast.success("Result published! Parents can now view it.");
  };

  const RatingDisplay = ({ rating }: { rating: number }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <div
          key={star}
          className={`w-4 h-4 rounded-full ${
            star <= rating ? "bg-[#FFD700]" : "bg-gray-400"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="outline"
          className="rounded-xl border-white/10 text-[#C0C8D3] hover:bg-[#0F243E] hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Results
        </Button>
        <div className="flex gap-2">
          <Badge className={
            resultData.status === "published" ? "bg-[#28A745] text-white border-0" :
            resultData.status === "approved" ? "bg-[#00BFFF] text-white border-0" :
            "bg-[#FFC107] text-white border-0"
          }>
            {resultData.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Report Card */}
      <Card className="rounded-xl bg-white text-gray-900 shadow-2xl">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#0A2540] to-[#0d3558] text-white p-8 text-center rounded-t-xl">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl">
              <School className="w-10 h-10 text-[#0A2540]" />
            </div>
          </div>
          <h1 className="text-3xl mb-2 text-white">Graceland Royal Academy Gombe</h1>
          <p className="text-[#FFD700] italic text-lg">"Wisdom & Illumination"</p>
          <p className="text-white/80 text-sm mt-2">P.O. Box XXX, Gombe State, Nigeria</p>
          <div className="mt-4 inline-block px-6 py-2 bg-white/10 rounded-full backdrop-blur-sm">
            <p className="text-sm text-white">
              Terminal Report - {resultData.term} {resultData.session}
            </p>
          </div>
        </div>

        <div className="p-8">
          {/* Student Information */}
          <div className="flex items-start gap-6 mb-6 pb-6 border-b-2 border-gray-200">
            <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-[#1E90FF] to-[#00BFFF] flex-shrink-0 flex items-center justify-center">
              <span className="text-white text-3xl">{resultData.student.name.charAt(0)}</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4 flex-1">
              <div>
                <p className="text-sm text-gray-600">Student Name</p>
                <p className="text-[#0A2540]">{resultData.student.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Student ID</p>
                <p className="text-[#0A2540]">{resultData.student.admissionNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Class</p>
                <p className="text-[#0A2540]">{resultData.class}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Session</p>
                <p className="text-[#0A2540]">{resultData.session}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Term</p>
                <p className="text-[#0A2540]">{resultData.term}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Number in Class</p>
                <p className="text-[#0A2540]">{resultData.classSize}</p>
              </div>
            </div>
          </div>

          {/* Academic Performance */}
          <div className="mb-6">
            <h3 className="text-lg text-[#0A2540] mb-4">Academic Performance</h3>
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#0A2540] text-white">
                  <tr>
                    <th className="p-3 text-left">Subject</th>
                    <th className="p-3 text-center">1st Test</th>
                    <th className="p-3 text-center">2nd Test</th>
                    <th className="p-3 text-center">Exam</th>
                    <th className="p-3 text-center">Total</th>
                    <th className="p-3 text-center">Grade</th>
                    <th className="p-3 text-center">Position</th>
                    <th className="p-3 text-left">Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {resultData.subjects.map((subject, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="p-3">{subject.subject}</td>
                      <td className="p-3 text-center">{subject.test1}</td>
                      <td className="p-3 text-center">{subject.test2}</td>
                      <td className="p-3 text-center">{subject.exam}</td>
                      <td className="p-3 text-center">{subject.total}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded ${
                          subject.grade.includes("A") ? "bg-green-100 text-green-700" : 
                          subject.grade.includes("B") ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {subject.grade}
                        </span>
                      </td>
                      <td className="p-3 text-center">{subject.position}</td>
                      <td className="p-3 text-sm text-gray-600">{subject.teacher}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#0A2540] text-white">
                    <td className="p-3" colSpan={4}>Total Score</td>
                    <td className="p-3 text-center">{resultData.totalScore}</td>
                    <td className="p-3 text-center" colSpan={3}>
                      Average: {resultData.average.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-[#FFD700]/10 border-2 border-[#FFD700] rounded-xl text-center">
              <p className="text-sm text-gray-600 mb-1">Overall Position</p>
              <p className="text-2xl text-[#0A2540]">{resultData.position}/{resultData.classSize}</p>
            </div>
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl text-center">
              <p className="text-sm text-gray-600 mb-1">Grade</p>
              <p className="text-2xl text-green-700">
                {resultData.average >= 80 ? "A" : resultData.average >= 70 ? "B" : resultData.average >= 60 ? "C" : "D"}
              </p>
            </div>
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl text-center">
              <p className="text-sm text-gray-600 mb-1">Percentage</p>
              <p className="text-2xl text-blue-700">{resultData.average.toFixed(1)}%</p>
            </div>
          </div>

          {/* Affective and Psychomotor Assessment */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg text-[#0A2540] mb-3">Affective Domain</h3>
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(resultData.affective).map(([key, value], index) => (
                      <tr key={key} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="p-3 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                        <td className="p-3 text-right">
                          <RatingDisplay rating={value} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg text-[#0A2540] mb-3">Psychomotor Domain</h3>
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(resultData.psychomotor).map(([key, value], index) => (
                      <tr key={key} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="p-3 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                        <td className="p-3 text-right">
                          <RatingDisplay rating={value} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Class Teacher's Comment</p>
              <p className="text-[#0A2540]">{resultData.teacherComment || "No comment provided"}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Principal's Comment</p>
              <Textarea
                value={principalComment}
                onChange={(e) => setPrincipalComment(e.target.value)}
                placeholder="Enter Principal's comment..."
                className="min-h-20 rounded-xl bg-white border-gray-300"
                disabled={resultData.status !== "pending"}
              />
            </div>
          </div>

          {/* Signatures */}
          <div className="grid md:grid-cols-3 gap-6 pt-6 border-t-2 border-gray-200">
            <div className="text-center">
              <div className="h-16 mb-2 border-b-2 border-gray-300" />
              <p className="text-sm text-gray-600">Class Teacher's Signature</p>
            </div>
            <div className="text-center">
              <div className="h-16 mb-2 border-b-2 border-gray-300" />
              <p className="text-sm text-gray-600">Principal's Signature</p>
            </div>
            <div className="text-center">
              <div className="h-16 mb-2 border-b-2 border-gray-300" />
              <p className="text-sm text-gray-600">Parent's Signature</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Rejection Reason (Only shown for pending results) */}
      {resultData.status === "pending" && (
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardHeader className="p-5 border-b border-white/10">
            <h3 className="text-white">Rejection Reason (Optional)</h3>
          </CardHeader>
          <CardContent className="p-5">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="If rejecting, please provide detailed reasons for the class teacher..."
              className="min-h-24 rounded-xl border-white/10 bg-[#0F243E] text-white"
            />
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {resultData.status === "pending" && (
          <>
            <Button
              onClick={handleReject}
              variant="outline"
              className="rounded-xl border-[#DC3545] text-[#DC3545] hover:bg-[#DC3545] hover:text-white"
            >
              <span className="w-4 h-4 mr-2" />
              Reject Result
            </Button>
            <Button
              onClick={handleApprove}
              className="bg-[#28A745] text-white hover:bg-[#28A745]/90 rounded-xl shadow-md hover:scale-105 transition-all"
            >
              <span className="w-4 h-4 mr-2" />
              Approve Result
            </Button>
          </>
        )}
        {resultData.status === "approved" && (
          <Button
            onClick={handlePublish}
            className="bg-[#1E90FF] text-white hover:bg-[#00BFFF] rounded-xl shadow-md hover:scale-105 transition-all"
          >
            <span className="w-4 h-4 mr-2" />
            Publish to Parents
          </Button>
        )}
        {resultData.status === "published" && (
          <Badge className="bg-[#28A745] text-white border-0 px-6 py-2 text-base">
            ✓ Published to Parents
          </Badge>
        )}
      </div>
    </div>
  );
}
