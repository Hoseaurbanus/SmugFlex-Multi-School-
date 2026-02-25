import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface ContactPageProps {
  onBack: () => void;
}

export function SchoolNewsPage({ onBack }: ContactPageProps) {
  const news = [
    {
      id: 1,
      title: "Graceland Royal Academy Wins Inter-School Science Competition",
      date: "November 20, 2025",
      author: "Admin",
      category: "Achievement",
      image: "/school-news-1.jpg",
      excerpt: "Our brilliant students brought home the first-place trophy at the Gombe State Inter-School Science Competition, competing against 25 schools.",
      content: "We are thrilled to announce that our team of talented students has won the first-place trophy at the annual Gombe State Inter-School Science Competition..."
    },
    {
      id: 2,
      title: "Second Term 2024/2025 Begins September 15",
      date: "November 18, 2025",
      author: "Principal",
      category: "Announcement",
      image: "/school-news-2.jpg",
      excerpt: "Important information about the resumption date for Second Term and what students need to prepare.",
      content: "The Second Term of the 2024/2025 academic session will commence on Monday, September 15, 2025. All students are expected to resume on this date..."
    },
    {
      id: 3,
      title: "New ICT Laboratory Inaugurated",
      date: "November 15, 2025",
      author: "Admin",
      category: "Facility",
      image: "/school-news-3.jpg",
      excerpt: "State-of-the-art computer laboratory with 50 workstations now available for student learning.",
      content: "We are proud to announce the inauguration of our new ICT laboratory, equipped with the latest technology to enhance digital learning..."
    },
    {
      id: 4,
      title: "Parent-Teacher Conference Scheduled",
      date: "November 10, 2025",
      author: "Vice Principal",
      category: "Event",
      image: "/school-news-4.jpg",
      excerpt: "Annual parent-teacher meeting to discuss student progress and development.",
      content: "The annual Parent-Teacher Conference is scheduled for December 5-6, 2025. This is an opportunity for parents to meet with teachers..."
    },
    {
      id: 5,
      title: "Sports Day 2025 Highlights",
      date: "November 5, 2025",
      author: "Sports Coordinator",
      category: "Sports",
      image: "/school-news-5.jpg",
      excerpt: "Recap of the exciting events and record-breaking performances at this year's Sports Day.",
      content: "Our annual Sports Day was a tremendous success with students showcasing their athletic abilities across various track and field events..."
    },
    {
      id: 6,
      title: "Excellence Awards: Celebrating Outstanding Students",
      date: "November 1, 2025",
      author: "Principal",
      category: "Achievement",
      image: "/school-news-6.jpg",
      excerpt: "Recognizing academic excellence and character development in our students.",
      content: "At our recent Excellence Awards ceremony, we celebrated students who demonstrated exceptional performance in academics, leadership..."
    }
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Achievement: "bg-green-500",
      Announcement: "bg-blue-500",
      Facility: "bg-purple-500",
      Event: "bg-orange-500",
      Sports: "bg-red-500"
    };
    return colors[category] || "bg-gray-500";
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
          <h1 className="text-3xl mb-2">School News & Announcements</h1>
          <p className="text-blue-100">Stay updated with the latest from Graceland Royal Academy</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* News Articles */}
          <div className="lg:col-span-2 space-y-6">
            {news.map((item) => (
              <Card key={item.id} className="rounded-xl border-none shadow-md overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={getCategoryColor(item.category)}>
                      {item.category}
                    </Badge>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="h-3 w-3" />
                      {item.date}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="h-3 w-3" />
                      {item.author}
                    </span>
                  </div>
                  <h2 className="text-xl mb-3">{item.title}</h2>
                  <p className="text-gray-600 mb-4">{item.excerpt}</p>
                  <Button variant="outline" size="sm">Read More</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Categories */}
            <Card className="rounded-xl border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {["Achievement", "Announcement", "Facility", "Event", "Sports"].map((cat) => (
                  <button
                    key={cat}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <span className="text-sm">{cat}</span>
                    <Badge variant="outline" className="text-xs">
                      {(news || []).filter(n => n.category === cat).length}
                    </Badge>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Recent Announcements */}
            <Card className="rounded-xl border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Quick Updates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-3">
                  <p className="text-sm mb-1">Mid-term break: Dec 15-20</p>
                  <p className="text-xs text-gray-500">November 18, 2025</p>
                </div>
                <div className="border-l-4 border-green-500 pl-3">
                  <p className="text-sm mb-1">Debate competition registration open</p>
                  <p className="text-xs text-gray-500">November 16, 2025</p>
                </div>
                <div className="border-l-4 border-orange-500 pl-3">
                  <p className="text-sm mb-1">School fees payment deadline extended</p>
                  <p className="text-xs text-gray-500">November 14, 2025</p>
                </div>
                <div className="border-l-4 border-purple-500 pl-3">
                  <p className="text-sm mb-1">New library books available</p>
                  <p className="text-xs text-gray-500">November 12, 2025</p>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="rounded-xl border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="h-5 w-5" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-[#2563EB] rounded p-2 text-center min-w-[50px]">
                      <div className="text-xs">DEC</div>
                      <div className="text-lg">05</div>
                    </div>
                    <div>
                      <h4 className="text-sm mb-1">Parent-Teacher Conference</h4>
                      <p className="text-xs text-gray-500">8:00 AM - 2:00 PM</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 text-[#10B981] rounded p-2 text-center min-w-[50px]">
                      <div className="text-xs">DEC</div>
                      <div className="text-lg">12</div>
                    </div>
                    <div>
                      <h4 className="text-sm mb-1">Inter-House Sports Competition</h4>
                      <p className="text-xs text-gray-500">All Day Event</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-100 text-purple-600 rounded p-2 text-center min-w-[50px]">
                      <div className="text-xs">DEC</div>
                      <div className="text-lg">20</div>
                    </div>
                    <div>
                      <h4 className="text-sm mb-1">End of Term Assembly</h4>
                      <p className="text-xs text-gray-500">10:00 AM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
