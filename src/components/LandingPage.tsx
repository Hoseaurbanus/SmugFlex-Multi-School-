import { School, BookOpen, Users, Award, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useState } from "react";
import schoolLogo from "../assets/images/school-logo.jpg";

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

export function LandingPage({ onNavigateToLogin }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm backdrop-blur-sm bg-white/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg ring-2 ring-[#FFD700]/30 p-1">
                <img 
                  src={schoolLogo} 
                  alt="Graceland Royal Academy Logo" 
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div>
                <h3 className="text-[#0A2540]">Graceland Royal Academy</h3>
                <p className="text-sm text-gray-600">Gombe</p>
              </div>
            </div>
            
            <nav className="hidden lg:flex items-center gap-8">
              <a href="#home" className="text-gray-700 hover:text-[#0A2540] transition-colors relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#FFD700] transition-all group-hover:w-full" />
              </a>
              <a href="#about" className="text-gray-700 hover:text-[#0A2540] transition-colors relative group">
                About
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#FFD700] transition-all group-hover:w-full" />
              </a>
              <a href="#features" className="text-gray-700 hover:text-[#0A2540] transition-colors relative group">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#FFD700] transition-all group-hover:w-full" />
              </a>
              <a href="#admissions" className="text-gray-700 hover:text-[#0A2540] transition-colors relative group">
                Admissions
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#FFD700] transition-all group-hover:w-full" />
              </a>
              <a href="#contact" className="text-gray-700 hover:text-[#0A2540] transition-colors relative group">
                Contact
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#FFD700] transition-all group-hover:w-full" />
              </a>
              <Button 
                onClick={onNavigateToLogin}
                className="bg-[#FFD700] text-[#0A2540] hover:bg-[#FFD700]/90 rounded-xl px-6 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                Login to Portal
              </Button>
            </nav>

            <div className="flex items-center gap-2 lg:hidden">
              <Button 
                onClick={onNavigateToLogin}
                className="bg-[#FFD700] text-[#0A2540] hover:bg-[#FFD700]/90 rounded-xl text-sm px-4"
              >
                Login
              </Button>
              <Button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                variant="ghost"
                className="p-2"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="lg:hidden mt-4 pb-4 space-y-2 border-t pt-4 animate-in slide-in-from-top-2">
              <a href="#home" className="block py-2 text-gray-700 hover:text-[#0A2540] transition-colors">Home</a>
              <a href="#about" className="block py-2 text-gray-700 hover:text-[#0A2540] transition-colors">About</a>
              <a href="#features" className="block py-2 text-gray-700 hover:text-[#0A2540] transition-colors">Features</a>
              <a href="#admissions" className="block py-2 text-gray-700 hover:text-[#0A2540] transition-colors">Admissions</a>
              <a href="#contact" className="block py-2 text-gray-700 hover:text-[#0A2540] transition-colors">Contact</a>
            </nav>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1603958956194-cf9718dba4b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBzY2hvb2wlMjBidWlsZGluZ3xlbnwxfHx8fDE3NjE4ODc3MjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`
          }}
        >
          <div className="absolute inset-0 bg-[#0A2540]/80" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-6">
            <School className="w-12 h-12 text-[#0A2540]" />
          </div>
          <h1 className="text-5xl md:text-6xl mb-4 text-white">Graceland Royal Academy Gombe</h1>
          <p className="text-2xl md:text-3xl text-[#FFD700] mb-8 italic">"Wisdom & Illumination"</p>
          <p className="max-w-2xl mx-auto mb-8 text-lg text-white/90">
            Excellence in education, nurturing young minds to become tomorrow's leaders through innovation, dedication, and moral values.
          </p>
          <Button 
            onClick={onNavigateToLogin}
            className="bg-[#FFD700] text-[#0A2540] hover:bg-[#FFD700]/90 rounded-xl px-8 py-6 h-auto"
          >
            Login to Portal
          </Button>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-[#0A2540] mb-4">About Us</h2>
            <div className="w-20 h-1 bg-[#FFD700] mx-auto rounded-full" />
          </div>
          
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-gray-700 mb-8">
              Graceland Royal Academy Gombe is a premier educational institution dedicated to providing quality education 
              that shapes character, builds knowledge, and prepares students for a successful future. Our commitment to 
              excellence has made us a leading choice for parents seeking the best education for their children.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-2 border-[#0A2540]/10 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#0A2540] flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-[#FFD700]" />
                  </div>
                  <h3 className="mb-2 text-[#0A2540]">Quality Education</h3>
                  <p className="text-gray-600 text-sm">Modern curriculum designed to meet international standards</p>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-[#0A2540]/10 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#0A2540] flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-[#FFD700]" />
                  </div>
                  <h3 className="mb-2 text-[#0A2540]">Expert Teachers</h3>
                  <p className="text-gray-600 text-sm">Highly qualified and dedicated teaching staff</p>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-[#0A2540]/10 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#0A2540] flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-[#FFD700]" />
                  </div>
                  <h3 className="mb-2 text-[#0A2540]">Excellence</h3>
                  <p className="text-gray-600 text-sm">Proven track record of academic achievements</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-[#0A2540] mb-4">Why Choose Us</h2>
            <div className="w-20 h-1 bg-[#FFD700] mx-auto rounded-full" />
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { title: "Modern Facilities", description: "State-of-the-art classrooms and laboratories" },
              { title: "Safe Environment", description: "Secure campus with 24/7 supervision" },
              { title: "Digital Learning", description: "Technology-enhanced education" },
              { title: "Moral Values", description: "Character development alongside academics" },
            ].map((item, index) => (
              <Card key={index} className="border-2 border-[#0A2540]/10 rounded-xl overflow-hidden hover:border-[#FFD700] transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-[#FFD700] flex items-center justify-center mb-4">
                    <School className="w-6 h-6 text-[#0A2540]" />
                  </div>
                  <h4 className="mb-2 text-[#0A2540]">{item.title}</h4>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-[#0A2540] text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl mb-6">Our Mission</h2>
          <p className="max-w-3xl mx-auto text-lg text-white/90">
            To provide holistic education that develops intellectual, physical, social, and moral capabilities 
            of our students, preparing them to be responsible citizens and leaders who will contribute positively 
            to society with wisdom and illumination.
          </p>
        </div>
      </section>

      {/* Admissions Section */}
      <section id="admissions" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-[#0A2540] mb-4">Admissions Information</h2>
            <div className="w-20 h-1 bg-[#FFD700] mx-auto rounded-full" />
          </div>
          
          <div className="max-w-4xl mx-auto text-center">
            <Card className="border-2 border-[#0A2540]/10 rounded-xl overflow-hidden shadow-lg">
              <CardContent className="p-8">
                <p className="text-gray-700 mb-6">
                  We are currently accepting applications for the upcoming academic session. 
                  Join a community of excellence where your child's future is our priority.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-[#0A2540] rounded-xl text-white">
                    <p className="text-sm text-[#FFD700]">Nursery</p>
                    <p>Ages 2-5</p>
                  </div>
                  <div className="p-4 bg-[#0A2540] rounded-xl text-white">
                    <p className="text-sm text-[#FFD700]">Primary</p>
                    <p>Ages 6-11</p>
                  </div>
                  <div className="p-4 bg-[#0A2540] rounded-xl text-white">
                    <p className="text-sm text-[#FFD700]">Secondary</p>
                    <p>Ages 12-17</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  For admission inquiries, please contact our administrative office or login to the portal.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-[#0A2540] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={schoolLogo} 
                  alt="Graceland Royal Academy Logo" 
                  className="w-16 h-16 object-contain bg-white rounded-full p-1"
                />
                <div>
                  <h3 className="text-white">Graceland Royal Academy</h3>
                  <p className="text-sm text-[#FFD700]">Wisdom & Illumination</p>
                </div>
              </div>
              <p className="text-white/80 text-sm">
                Building tomorrow's leaders through quality education and moral values.
              </p>
            </div>
            
            <div>
              <h4 className="mb-4 text-white">Contact Information</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-[#FFD700]" />
                  <p className="text-sm text-white/80">Gombe State, Nigeria</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#FFD700]" />
                  <p className="text-sm text-white/80">+234 XXX XXX XXXX</p>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#FFD700]" />
                  <p className="text-sm text-white/80">info@gracelandroyalacademy.edu.ng</p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="mb-4 text-white">Follow Us</h4>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#FFD700] flex items-center justify-center cursor-pointer transition-colors">
                  <Facebook className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#FFD700] flex items-center justify-center cursor-pointer transition-colors">
                  <Twitter className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#FFD700] flex items-center justify-center cursor-pointer transition-colors">
                  <Instagram className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-6 text-center">
            <p className="text-white/60 text-sm">
              © 2025 Graceland Royal Academy Gombe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}