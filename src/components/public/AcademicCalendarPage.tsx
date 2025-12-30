import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface AcademicCalendarPageProps {
  onBack: () => void;
}

export function AcademicCalendarPage({ onBack }: AcademicCalendarPageProps) {
  const firstTerm = [
    { date: "Sept 15, 2025", event: "First Term Begins", type: "term" },
    { date: "Sept 18-19, 2025", event: "Orientation for New Students", type: "academic" },
    { date: "Oct 1, 2025", event: "Independence Day Holiday", type: "holiday" },
    { date: "Oct 15-17, 2025", event: "Mid-Term Break", type: "break" },
    { date: "Nov 5, 2025", event: "Inter-House Sports Competition", type: "event" },
    { date: "Nov 20-21, 2025", event: "First CA Tests", type: "exam" },
    { date: "Dec 5-6, 2025", event: "Parent-Teacher Conference", type: "event" },
    { date: "Dec 10-15, 2025", event: "End of Term Examinations", type: "exam" },
    { date: "Dec 20, 2025", event: "First Term Ends", type: "term" },
    { date: "Dec 21, 2025 - Jan 5, 2026", event: "Christmas & New Year Break", type: "holiday" }
  ];

  const secondTerm = [
    { date: "Jan 8, 2026", event: "Second Term Begins", type: "term" },
    { date: "Jan 15, 2026", event: "Mock Examinations (SS 3)", type: "exam" },
    { date: "Feb 10-12, 2026", event: "Mid-Term Break", type: "break" },
    { date: "Feb 20, 2026", event: "Career Day", type: "event" },
    { date: "Mar 5-6, 2026", event: "Second CA Tests", type: "exam" },
    { date: "Mar 15, 2026", event: "Inter-School Debate Competition", type: "event" },
    { date: "Mar 25-30, 2026", event: "End of Term Examinations", type: "exam" },
    { date: "Apr 3, 2026", event: "Second Term Ends", type: "term" },
    { date: "Apr 4-20, 2026", event: "Easter Break", type: "holiday" }
  ];

  const thirdTerm = [
    { date: "Apr 23, 2026", event: "Third Term Begins", type: "term" },
    { date: "May 1, 2026", event: "Workers' Day Holiday", type: "holiday" },
    { date: "May 10-12, 2026", event: "Mid-Term Break", type: "break" },
    { date: "May 20-21, 2026", event: "Third CA Tests", type: "exam" },
    { date: "Jun 5, 2026", event: "School Anniversary Celebration", type: "event" },
    { date: "Jun 12, 2026", event: "Democracy Day Holiday", type: "holiday" },
    { date: "Jun 20, 2026", event: "WAEC/NECO Begins (SS 3)", type: "exam" },
    { date: "Jul 1-7, 2026", event: "End of Session Examinations", type: "exam" },
    { date: "Jul 10, 2026", event: "Prize Giving & Graduation Ceremony", type: "event" },
    { date: "Jul 15, 2026", event: "Third Term Ends", type: "term" },
    { date: "Jul 16 - Sept 14, 2026", event: "Long Vacation", type: "holiday" }
  ];

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      term: "bg-blue-500",
      academic: "bg-purple-500",
      holiday: "bg-red-500",
      break: "bg-orange-500",
      event: "bg-green-500",
      exam: "bg-yellow-600"
    };
    return colors[type] || "bg-gray-500";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      term: "Term",
      academic: "Academic",
      holiday: "Holiday",
      break: "Break",
      event: "Event",
      exam: "Examination"
    };
    return labels[type] || type;
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
          <h1 className="text-3xl mb-2">Academic Calendar 2025/2026</h1>
          <p className="text-blue-100">Plan ahead with our comprehensive academic schedule</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Overview */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 p-4 rounded-lg mb-3">
                  <span className="h-8 w-8 text-[#2563EB] mx-auto" />
                </div>
                <h3 className="mb-1">First Term</h3>
                <p className="text-sm text-gray-600">Sept 15 - Dec 20, 2025</p>
                <Badge className="mt-2 bg-blue-500">14 Weeks</Badge>
              </div>

              <div className="text-center">
                <div className="bg-green-100 p-4 rounded-lg mb-3">
                  <span className="h-8 w-8 text-[#10B981] mx-auto" />
                </div>
                <h3 className="mb-1">Second Term</h3>
                <p className="text-sm text-gray-600">Jan 8 - Apr 3, 2026</p>
                <Badge className="mt-2 bg-green-500">12 Weeks</Badge>
              </div>

              <div className="text-center">
                <div className="bg-purple-100 p-4 rounded-lg mb-3">
                  <span className="h-8 w-8 text-purple-600 mx-auto" />
                </div>
                <h3 className="mb-1">Third Term</h3>
                <p className="text-sm text-gray-600">Apr 23 - Jul 15, 2026</p>
                <Badge className="mt-2 bg-purple-500">12 Weeks</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Legend */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Calendar Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-blue-500">Term Start/End</Badge>
              <Badge className="bg-purple-500">Academic Event</Badge>
              <Badge className="bg-red-500">Public Holiday</Badge>
              <Badge className="bg-orange-500">Break</Badge>
              <Badge className="bg-green-500">School Event</Badge>
              <Badge className="bg-yellow-600">Examination</Badge>
            </div>
          </CardContent>
        </Card>

        {/* First Term */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>First Term 2025</CardTitle>
                <p className="text-sm text-gray-600 mt-1">September 15 - December 20, 2025</p>
              </div>
              <Badge className="bg-blue-500">14 Weeks</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {firstTerm.map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="min-w-[120px]">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="h-3 w-3" />
                      {item.date}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="mb-1">{item.event}</p>
                    <Badge variant="outline" className={`${getTypeColor(item.type)} text-white border-0`}>
                      {getTypeLabel(item.type)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Second Term */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Second Term 2026</CardTitle>
                <p className="text-sm text-gray-600 mt-1">January 8 - April 3, 2026</p>
              </div>
              <Badge className="bg-green-500">12 Weeks</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {secondTerm.map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="min-w-[120px]">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="h-3 w-3" />
                      {item.date}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="mb-1">{item.event}</p>
                    <Badge variant="outline" className={`${getTypeColor(item.type)} text-white border-0`}>
                      {getTypeLabel(item.type)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Third Term */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Third Term 2026</CardTitle>
                <p className="text-sm text-gray-600 mt-1">April 23 - July 15, 2026</p>
              </div>
              <Badge className="bg-purple-500">12 Weeks</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {thirdTerm.map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="min-w-[120px]">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="h-3 w-3" />
                      {item.date}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="mb-1">{item.event}</p>
                    <Badge variant="outline" className={`${getTypeColor(item.type)} text-white border-0`}>
                      {getTypeLabel(item.type)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardHeader>
            <CardTitle>Important Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Students are expected to resume on the first day of each term</li>
              <li>• Public holidays are subject to government announcements</li>
              <li>• Mid-term breaks are for rest; students should not travel long distances</li>
              <li>• Examination dates are final unless otherwise communicated</li>
              <li>• Parents are encouraged to plan vacations around school breaks</li>
              <li>• The calendar is subject to change due to unforeseen circumstances</li>
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
