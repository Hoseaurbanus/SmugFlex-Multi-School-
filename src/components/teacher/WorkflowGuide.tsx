import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';

interface WorkflowGuideProps {
  isClassTeacher: boolean;
}

export function WorkflowGuide({ isClassTeacher }: WorkflowGuideProps) {
  if (isClassTeacher) {
    return (
      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <CardHeader className="p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 text-[#F59E0B]" />
            <h3 className="text-lg text-gray-900">Class Teacher Result Workflow</h3>
            <Badge className="ml-auto bg-[#F59E0B] text-white border-0">Full Access</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center text-white">
                  1
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-gray-900 mb-1">Enter Your Subject Scores</h4>
                <p className="text-sm text-gray-600">
                  Go to "Enter Scores" and input CA1, CA2, and Exam marks for subjects you teach. Submit when complete.
                </p>
              </div>
              <span className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-2" />
            </div>

            <span className="w-5 h-5 text-gray-400 ml-5" />

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center text-white">
                  2
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-gray-900 mb-1">Wait for All Subject Teachers</h4>
                <p className="text-sm text-gray-600">
                  Ensure all subject teachers have submitted scores for your class. Check the "Compile Results" page to monitor progress.
                </p>
              </div>
              <span className="w-5 h-5 text-[#3B82F6] flex-shrink-0 mt-2" />
            </div>

            <span className="w-5 h-5 text-gray-400 ml-5" />

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center text-white">
                  3
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-gray-900 mb-1">Enter Affective & Psychomotor Assessments</h4>
                <p className="text-sm text-gray-600">
                  Go to "Affective & Psychomotor" and rate each student on behavioral traits (attentiveness, honesty, neatness, obedience, responsibility) and skills (handwriting, sports, verbal fluency, etc.) on a scale of 1-5.
                </p>
              </div>
              <span className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-2" />
            </div>

            <span className="w-5 h-5 text-gray-400 ml-5" />

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center text-white">
                  4
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-gray-900 mb-1">Add Class Teacher Comments</h4>
                <p className="text-sm text-gray-600">
                  In "Compile Results" page, write individualized comments for each student about their overall performance and areas for improvement.
                </p>
              </div>
              <span className="w-5 h-5 text-[#3B82F6] flex-shrink-0 mt-2" />
            </div>

            <span className="w-5 h-5 text-gray-400 ml-5" />

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center text-white">
                  5
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-gray-900 mb-1">Compile & Submit to Admin</h4>
                <p className="text-sm text-gray-600">
                  Click "Compile" for each student to bundle all data together, then "Submit to Admin" for final approval. Admin will review and approve for printing.
                </p>
              </div>
              <span className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-2" />
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-gray-900">
              <strong>Important:</strong> You cannot submit results to Admin until all subject scores are received, 
              affective/psychomotor assessments are complete, and comments are added for all students.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
      <CardHeader className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 text-[#3B82F6]" />
          <h3 className="text-lg text-gray-900">Subject Teacher Score Entry Workflow</h3>
          <Badge className="ml-auto bg-[#3B82F6] text-white border-0">Score Entry</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center text-white">
                1
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-gray-900 mb-1">Select Class & Subject</h4>
              <p className="text-sm text-gray-600">
                Navigate to "Enter Scores" and select the class and subject you are assigned to teach from the dropdown menu.
              </p>
            </div>
          </div>

          <span className="w-5 h-5 text-gray-400 ml-5" />

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center text-white">
                2
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-gray-900 mb-1">Enter Student Scores</h4>
              <p className="text-sm text-gray-600">
                For each student, enter:
              </p>
              <ul className="text-sm text-gray-600 mt-2 ml-4 space-y-1">
                <li>• 1st CA (Continuous Assessment): 0-20 marks</li>
                <li>• 2nd CA: 0-20 marks</li>
                <li>• Exam: 0-60 marks</li>
              </ul>
              <p className="text-sm text-gray-600 mt-2">
                The system will automatically calculate Total (100), Grade (A-F), and Remark.
              </p>
            </div>
          </div>

          <span className="w-5 h-5 text-gray-400 ml-5" />

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center text-white">
                3
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-gray-900 mb-1">Review & Save</h4>
              <p className="text-sm text-gray-600">
                Review all entries for accuracy. You can "Save Draft" to preserve your work or continue editing. Class statistics (average, min, max) are calculated automatically.
              </p>
            </div>
          </div>

          <span className="w-5 h-5 text-gray-400 ml-5" />

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center text-white">
                4
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-gray-900 mb-1">Submit to Class Teacher</h4>
              <p className="text-sm text-gray-600">
                When all students have complete scores, click "Submit to Class Teacher". Your scores will be forwarded to the class teacher for final result compilation. Your name will be automatically attached to the submitted scores.
              </p>
            </div>
            <span className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-2" />
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-sm text-gray-900">
            <strong>Note:</strong> You must enter scores for ALL students before submitting. 
            The class teacher will compile your scores with other subjects and add behavioral assessments before final approval.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
