import { Book, Target, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

interface AboutPageProps {
  onBack: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
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
          <h1 className="text-3xl mb-2">About Our School</h1>
          <p className="text-blue-100">Excellence & Character</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="rounded-xl border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Target className="h-6 w-6 text-[#2563EB]" />
                </div>
                <div>
                  <h2 className="text-xl mb-3">Our Mission</h2>
                  <p className="text-gray-600 leading-relaxed">
                    To provide world-class education that nurtures academic excellence,
                    moral values, and leadership skills in every student, preparing them
                    to become responsible global citizens.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <span className="h-6 w-6 text-[#10B981]" />
                </div>
                <div>
                  <h2 className="text-xl mb-3">Our Vision</h2>
                  <p className="text-gray-600 leading-relaxed">
                    To be the leading educational institution in Northern Nigeria,
                    recognized for academic excellence, character development, and
                    producing future leaders who impact their communities positively.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Core Values */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardContent className="p-6">
            <h2 className="text-2xl mb-6">Our Core Values</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="bg-blue-100 p-4 rounded-full mb-4">
                  <BookOpen className="h-8 w-8 text-[#2563EB]" />
                </div>
                <h3 className="mb-2">Excellence</h3>
                <p className="text-gray-600 text-sm">
                  We pursue the highest standards in academics, character, and service.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="bg-green-100 p-4 rounded-full mb-4">
                  <span className="h-8 w-8 text-[#10B981]" />
                </div>
                <h3 className="mb-2">Integrity</h3>
                <p className="text-gray-600 text-sm">
                  We uphold honesty, transparency, and ethical conduct in all we do.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="bg-purple-100 p-4 rounded-full mb-4">
                  <span className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="mb-2">Community</h3>
                <p className="text-gray-600 text-sm">
                  We foster a supportive, inclusive environment where everyone thrives.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* School History */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardContent className="p-6">
            <h2 className="text-2xl mb-4">Our History</h2>
            <div className="prose max-w-none text-gray-600">
              <p className="mb-4">
                Founded with a clear vision: to provide quality education that combines academic
                excellence with strong moral values and practical skills.
              </p>
              <p className="mb-4">
                Over the years, we have grown from a small primary school to a
                comprehensive institution serving both primary and secondary students.
                Our commitment to "Excellence & Character" has guided us in creating
                an environment where students not only excel academically but also
                develop into well-rounded individuals.
              </p>
              <p>
                Today, we are proud to be one of the leading schools in the region,
                with a track record of excellent results, talented alumni, and a
                reputation for producing students of character and capability.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Facilities */}
        <Card className="rounded-xl border-none shadow-md mb-8">
          <CardContent className="p-6">
            <h2 className="text-2xl mb-4">Our Facilities</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded">
                  <span className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="mb-1">Modern Classrooms</h3>
                  <p className="text-sm text-gray-600">
                    Well-ventilated, spacious classrooms equipped with modern learning aids
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded">
                  <span className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="mb-1">Computer Laboratory</h3>
                  <p className="text-sm text-gray-600">
                    State-of-the-art computer lab with internet connectivity
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded">
                  <span className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="mb-1">Science Laboratories</h3>
                  <p className="text-sm text-gray-600">
                    Fully equipped Physics, Chemistry, and Biology labs
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded">
                  <span className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="mb-1">Library & Reading Room</h3>
                  <p className="text-sm text-gray-600">
                    Extensive collection of books and quiet study spaces
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded">
                  <span className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="mb-1">Sports Facilities</h3>
                  <p className="text-sm text-gray-600">
                    Football field, basketball court, and athletic tracks
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded">
                  <span className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="mb-1">Medical Center</h3>
                  <p className="text-sm text-gray-600">
                    On-site medical facility with qualified healthcare professionals
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leadership */}
        <Card className="rounded-xl border-none shadow-md">
          <CardContent className="p-6">
            <h2 className="text-2xl mb-4">Our Leadership</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-[#2563EB] pl-4">
                <h3 className="mb-1">Principal</h3>
                <p className="text-sm text-gray-600">
                  M.Ed Educational Administration, 15+ years in educational leadership
                </p>
              </div>

              <div className="border-l-4 border-[#10B981] pl-4">
                <h3 className="mb-1">Vice Principal (Academics)</h3>
                <p className="text-sm text-gray-600">
                  M.Sc Mathematics Education, Curriculum development specialist
                </p>
              </div>

              <div className="border-l-4 border-purple-600 pl-4">
                <h3 className="mb-1">Vice Principal (Administration)</h3>
                <p className="text-sm text-gray-600">
                  B.Ed Administration, Expert in school operations management
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
