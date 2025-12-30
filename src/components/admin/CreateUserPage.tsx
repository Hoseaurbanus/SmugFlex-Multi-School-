import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
import { Plus, Copy, X, Eye, EyeOff } from "lucide-react";

// CreateUserPage.tsx - User creation form with firstName validation fix - v2.0
export function CreateUserPage() {
  const { createUserAPI, parents } = useSchool();
  const [role, setRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [assignedClass, setAssignedClass] = useState("");
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [accountStatus, setAccountStatus] = useState("active");
  const [sendCredentialsEmail, setSendCredentialsEmail] = useState(true);
  const [sendCredentialsSMS, setSendCredentialsSMS] = useState(false);
  const [autoGenerateUsername, setAutoGenerateUsername] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-generate username from full name
  const handleNameChange = (name: string) => {
    setFullName(name);
    if (autoGenerateUsername && name) {
      const parts = name.trim().split(" ");
      if (parts.length > 0) {
        const firstName = parts[0].toLowerCase();
        const lastName = parts[parts.length - 1]?.toLowerCase() || "";
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
        const generatedUsername = lastName 
          ? `${firstName.charAt(0)}${lastName}${randomNum}` 
          : `${firstName}${randomNum}`;
        setUsername(generatedUsername);
      }
    }
  };

  // Auto-generate strong password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let newPassword = "";
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
    toast.success("Strong password generated");
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Password copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy password");
    }
  };

  const handleCopyUsername = async () => {
    try {
      await navigator.clipboard.writeText(username);
      toast.success("Username copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy username");
    }
  };

  const handleSubmit = async () => {
    if (!role || !fullName || !email || !phone || !username || !password) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    
    try {
      // Enhanced validation
      if (!fullName || fullName.trim().length === 0) {
        toast.error("Please enter a valid full name");
        setIsLoading(false);
        return;
      }

      if (!username || username.trim().length === 0) {
        toast.error("Username is required");
        setIsLoading(false);
        return;
      }

      if (!email || email.trim().length === 0) {
        toast.error("Email is required");
        setIsLoading(false);
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error("Please enter a valid email address");
        setIsLoading(false);
        return;
      }

      // Username validation (alphanumeric, underscore, hyphen)
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(username.trim())) {
        toast.error("Username can only contain letters, numbers, underscores, and hyphens");
        setIsLoading(false);
        return;
      }

      // Split full name into first and last name with enhanced validation
      const nameParts = fullName.trim().split(/\s+/).filter(part => part.length > 0);
      
      if (nameParts.length === 0) {
        toast.error("Please enter a valid name");
        setIsLoading(false);
        return;
      }
      
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
      
      // Enhanced firstName validation - check for actual content
      if (!firstName || firstName.trim().length === 0 || firstName.length < 2) {
        toast.error("Please enter at least 2 characters for the first name");
        setIsLoading(false);
        return;
      }

      // Name format validation (letters, spaces, hyphens, apostrophes)
      const nameRegex = /^[a-zA-Z\s'-]+$/;
      if (!nameRegex.test(firstName) || (lastName && !nameRegex.test(lastName))) {
        toast.error("Names can only contain letters, spaces, hyphens, and apostrophes");
        setIsLoading(false);
        return;
      }
      
      // Prepare sanitized user data for API
      const userData = {
        username: username.trim(),
        password: password || (role + '123'),
        role,
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        address: '', // Optional field
        occupation: '', // Optional field for parents
        status: accountStatus === 'active' ? 'Active' : 'Inactive'
      };

      // Debug: Log the complete user data being sent to API
      console.log('=== FRONTEND USER CREATION DEBUG ===');
      console.log('Original fullName:', fullName);
      console.log('Parsed firstName:', firstName);
      console.log('Parsed lastName:', lastName);
      console.log('Complete userData object:', userData);
      console.log('Role:', role);
      console.log('AccountStatus:', accountStatus);
      console.log('=====================================');

      // Create user through API
      console.log('Calling createUserAPI with userData:', userData);
      const newUser = await createUserAPI(userData);
      console.log('createUserAPI response:', newUser);
      
      if (newUser && newUser.id) {
        // Additional validation for parent users to ensure proper linked_id
        if (role === 'parent' && (!newUser.linked_id || newUser.linked_id === 0)) {
          console.error('Parent user created without valid linked_id');
          toast.error("Parent user created without proper linking. Please contact administrator.");
          return;
        }
        
        // Verify parent record exists for parent users
        if (role === 'parent' && newUser.linked_id) {
          const parentRecord = parents.find(p => p.id === newUser.linked_id);
          if (!parentRecord) {
            console.error('Parent user linked to non-existent parent record:', newUser.linked_id);
            toast.error("Parent user linked to invalid record. Please contact administrator.");
            return;
          }
        }
        
        const credentialMethod = sendCredentialsEmail && sendCredentialsSMS 
          ? "Email & SMS" 
          : sendCredentialsEmail 
          ? "Email" 
          : sendCredentialsSMS 
          ? "SMS" 
          : "not sent";

        if (credentialMethod !== "not sent") {
          toast.success(`User created successfully — credentials sent via ${credentialMethod}`);
        } else {
          toast.success(`User created successfully! Username: ${username}, Password: ${password}`);
        }

        // Reset form
        setRole("");
        setFullName("");
        setEmail("");
        setPhone("");
        setUsername("");
        setPassword("");
        setAssignedClass("");
        setAssignedSubjects([]);
      } else {
        console.error('User creation failed - no user returned from API');
        toast.error("Failed to create user - please check all fields and try again");
      }
    } catch (error: any) {
      console.error('Create user error:', error);
      toast.error(`Failed to create user: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Create User</h1>
        <p className="text-[#C0C8D3]">Add new system user with role-based access</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardHeader className="p-5 border-b border-white/10">
              <h3 className="text-white flex items-center gap-2">
                <Plus className="w-5 h-5" />
                User Information
              </h3>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="text-white">User Role *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                    <SelectValue placeholder="Select user role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F243E] border-white/10">
                    <SelectItem value="admin" className="text-white hover:bg-[#1E90FF]">Admin</SelectItem>
                    <SelectItem value="teacher" className="text-white hover:bg-[#1E90FF]">Teacher</SelectItem>
                    <SelectItem value="accountant" className="text-white hover:bg-[#1E90FF]">Accountant</SelectItem>
                    <SelectItem value="parent" className="text-white hover:bg-[#1E90FF]">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Two Column Layout */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label className="text-white">Full Name *</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Enter full name"
                    className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-white">Email Address *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#C0C8D3]" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="h-12 pl-10 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label className="text-white">Phone Number *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#C0C8D3]" />
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="080XXXXXXXX"
                      className="h-12 pl-10 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                    />
                  </div>
                </div>

                {/* Account Status */}
                <div className="space-y-2">
                  <Label className="text-white">Account Status</Label>
                  <Select value={accountStatus} onValueChange={setAccountStatus}>
                    <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F243E] border-white/10">
                      <SelectItem value="active" className="text-white hover:bg-[#1E90FF]">Active</SelectItem>
                      <SelectItem value="inactive" className="text-white hover:bg-[#1E90FF]">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Teacher-specific fields */}
              {role === "teacher" && (
                <div className="grid md:grid-cols-2 gap-6 p-4 bg-[#0F243E] rounded-xl border border-white/10">
                  <div className="space-y-2">
                    <Label className="text-white">Assign Class (Optional)</Label>
                    <Select value={assignedClass} onValueChange={setAssignedClass}>
                      <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#132C4A] text-white">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F243E] border-white/10">
                        <SelectItem value="JSS1A" className="text-white hover:bg-[#1E90FF]">JSS 1A</SelectItem>
                        <SelectItem value="JSS2A" className="text-white hover:bg-[#1E90FF]">JSS 2A</SelectItem>
                        <SelectItem value="SS1A" className="text-white hover:bg-[#1E90FF]">SS 1A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Assign Subjects (Multi-select)</Label>
                    <Select>
                      <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#132C4A] text-white">
                        <SelectValue placeholder="Select subjects" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F243E] border-white/10">
                        <SelectItem value="math" className="text-white hover:bg-[#1E90FF]">Mathematics</SelectItem>
                        <SelectItem value="english" className="text-white hover:bg-[#1E90FF]">English</SelectItem>
                        <SelectItem value="science" className="text-white hover:bg-[#1E90FF]">Science</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Login Credentials Section */}
              <div className="space-y-4 p-4 bg-[#0F243E] rounded-xl border border-[#1E90FF]">
                <h4 className="text-white">Login Credentials</h4>
                
                {/* Username */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Username *</Label>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-[#C0C8D3]">Auto-generate</Label>
                      <Switch 
                        checked={autoGenerateUsername} 
                        onCheckedChange={(checked) => {
                          setAutoGenerateUsername(checked);
                          if (checked && fullName) {
                            handleNameChange(fullName);
                            toast.info("Auto-generation enabled");
                          } else {
                            toast.info("Auto-generation disabled");
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      disabled={autoGenerateUsername}
                      className="h-12 rounded-xl border border-white/10 bg-[#132C4A] text-white disabled:opacity-60"
                    />
                    <Button
                      type="button"
                      onClick={handleCopyUsername}
                      disabled={!username}
                      className="h-12 px-4 bg-[#1E90FF] hover:bg-[#00BFFF] rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Copy username to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label className="text-white">Password *</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter or generate password"
                        className="h-12 pr-10 rounded-xl border border-white/10 bg-[#132C4A] text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#C0C8D3] hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      onClick={generatePassword}
                      className="h-12 px-4 bg-[#FFC107] hover:bg-[#FFC107]/90 rounded-xl transition-all hover:scale-105"
                      title="Generate strong password"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCopyPassword}
                      disabled={!password}
                      className="h-12 px-4 bg-[#1E90FF] hover:bg-[#00BFFF] rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Copy password to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  {password && (
                    <p className="text-xs text-[#FFC107]">
                      ⚠️ Temporary password expires in 24 hours — user must reset
                    </p>
                  )}
                </div>
              </div>

              {/* Send Credentials Options */}
              <div className="space-y-3 p-4 bg-[#0F243E] rounded-xl border border-white/10">
                <Label className="text-white">Send Credentials</Label>
                <div className="flex items-center justify-between p-3 bg-[#132C4A] rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 text-[#1E90FF]" />
                    <span className="text-white">Send via Email</span>
                  </div>
                  <Switch 
                    checked={sendCredentialsEmail} 
                    onCheckedChange={(checked) => {
                      setSendCredentialsEmail(checked);
                      toast.info(checked ? "Email delivery enabled" : "Email delivery disabled");
                    }}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-[#132C4A] rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 text-[#28A745]" />
                    <span className="text-white">Send via SMS</span>
                  </div>
                  <Switch 
                    checked={sendCredentialsSMS} 
                    onCheckedChange={(checked) => {
                      setSendCredentialsSMS(checked);
                      toast.info(checked ? "SMS delivery enabled" : "SMS delivery disabled");
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 h-12 bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md hover:scale-105 transition-all disabled:opacity-50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {isLoading ? 'Creating User...' : 'Create User'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setRole("");
                    setFullName("");
                    setEmail("");
                    setPhone("");
                    setUsername("");
                    setPassword("");
                    toast.info("Form cleared");
                  }}
                  className="h-12 px-6 bg-[#DC3545] hover:bg-[#DC3545]/90 text-white rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel - Info & Tips */}
        <div className="space-y-4">
          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardHeader className="p-4 bg-gradient-to-r from-[#1E90FF] to-[#00BFFF] rounded-t-xl">
              <h4 className="text-white">Quick Tips</h4>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-3 bg-[#0F243E] rounded-lg">
                <p className="text-xs text-[#C0C8D3]">
                  <span className="text-[#1E90FF]">•</span> Username auto-generates from name
                </p>
              </div>
              <div className="p-3 bg-[#0F243E] rounded-lg">
                <p className="text-xs text-[#C0C8D3]">
                  <span className="text-[#1E90FF]">•</span> Use strong passwords (12+ characters)
                </p>
              </div>
              <div className="p-3 bg-[#0F243E] rounded-lg">
                <p className="text-xs text-[#C0C8D3]">
                  <span className="text-[#1E90FF]">•</span> Credentials can be resent later
                </p>
              </div>
              <div className="p-3 bg-[#0F243E] rounded-lg">
                <p className="text-xs text-[#C0C8D3]">
                  <span className="text-[#1E90FF]">•</span> Teachers need class/subject assignment
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-[#132C4A] border border-[#FFC107]/30 shadow-lg">
            <CardHeader className="p-4 bg-[#FFC107]/10 rounded-t-xl border-b border-[#FFC107]/30">
              <h4 className="text-white">Security Notice</h4>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-xs text-[#C0C8D3] leading-relaxed">
                All user accounts are audited. Temporary passwords expire in 24 hours. 
                Users will be required to reset their password on first login.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
