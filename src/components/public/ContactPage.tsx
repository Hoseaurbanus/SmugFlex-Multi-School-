import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { useState } from "react";
import { toast } from "sonner";

interface ContactPageProps {
  onBack: () => void;
}

export function ContactPage({ onBack }: ContactPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent successfully! We'll get back to you soon.");
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
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
          <h1 className="text-3xl mb-2">Contact Us</h1>
          <p className="text-blue-100">We'd love to hear from you</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-xl border-none shadow-md">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <span className="h-6 w-6 text-[#2563EB]" />
                  </div>
                  <div>
                    <h3 className="mb-1">Visit Us</h3>
                    <p className="text-sm text-gray-600">
                      123 Education Avenue<br />
                      Gombe, Gombe State<br />
                      Nigeria
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <span className="h-6 w-6 text-[#10B981]" />
                  </div>
                  <div>
                    <h3 className="mb-1">Call Us</h3>
                    <p className="text-sm text-gray-600">
                      +234 803 456 7890<br />
                      +234 805 123 4567
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <span className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="mb-1">Email Us</h3>
                    <p className="text-sm text-gray-600">
                      info@gracelandgombe.edu.ng<br />
                      admissions@gracelandgombe.edu.ng
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <span className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="mb-1">Office Hours</h3>
                    <p className="text-sm text-gray-600">
                      Monday - Friday<br />
                      8:00 AM - 4:00 PM<br />
                      Saturday: 9:00 AM - 1:00 PM
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Contacts */}
            <Card className="rounded-xl border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Department Contacts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-3">
                  <h4 className="text-sm mb-1">Admissions</h4>
                  <p className="text-xs text-gray-600">ext. 101</p>
                </div>
                <div className="border-l-4 border-green-500 pl-3">
                  <h4 className="text-sm mb-1">Accounts</h4>
                  <p className="text-xs text-gray-600">ext. 102</p>
                </div>
                <div className="border-l-4 border-purple-500 pl-3">
                  <h4 className="text-sm mb-1">Principal's Office</h4>
                  <p className="text-xs text-gray-600">ext. 103</p>
                </div>
                <div className="border-l-4 border-orange-500 pl-3">
                  <h4 className="text-sm mb-1">ICT Support</h4>
                  <p className="text-xs text-gray-600">ext. 104</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="rounded-xl border-none shadow-md">
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
                <p className="text-sm text-gray-600">
                  Fill out the form below and we'll get back to you as soon as possible
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter your full name"
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="your.email@example.com"
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+234 803 456 7890"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="What is this regarding?"
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Type your message here..."
                      required
                      rows={6}
                      className="mt-1 resize-none"
                    />
                  </div>

                  <Button type="submit" className="bg-[#2563EB] hover:bg-[#1d4ed8] w-full md:w-auto">
                    <span className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Map */}
            <Card className="rounded-xl border-none shadow-md mt-8">
              <CardHeader>
                <CardTitle>Find Us</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                  <p className="text-gray-500">Map Location</p>
                  {/* In production, integrate Google Maps here */}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
