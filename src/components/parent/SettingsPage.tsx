import { useState, useEffect } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, Save, Shield, Bell, Globe, Smartphone, Camera, Upload, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";

interface ParentProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  occupation?: string;
  workplace?: string;
  relationship?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  profilePicture?: string;
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    whatsapp: boolean;
  };
  privacySettings: {
    shareContactInfo: boolean;
    shareEmergencyInfo: boolean;
    allowPhotoSharing: boolean;
  };
}

export function SettingsPage() {
  const { 
    currentUser, 
    parents, 
    updateParent,
    loadParentsFromAPI,
    loadSchoolSettings,
    getParentChildren,
    getParentChildrenFromAPI,
    feeStructures,
    loadFeeStructuresFromAPI,
    loadStudentFeeBalancesFromAPI
  } = useSchool();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState<ParentProfile>({
    id: 0,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    occupation: '',
    workplace: '',
    relationship: '',
    emergencyContact: '',
    emergencyPhone: '',
    profilePicture: '',
    communicationPreferences: {
      email: true,
      sms: true,
      push: true,
      whatsapp: false
    },
    privacySettings: {
      shareContactInfo: true,
      shareEmergencyInfo: true,
      allowPhotoSharing: false
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load parent data on component mount
  useEffect(() => {
    const loadParentData = async () => {
      if (currentUser && currentUser.role === 'parent') {
        setLoading(true);
        try {
          // Load ALL required data like MyChildrenPage
          await Promise.all([
            loadParentsFromAPI(),
            loadSchoolSettings(),
            loadFeeStructuresFromAPI(), // ← IMPORTANT: Load fee structures for fee calculations
            loadStudentFeeBalancesFromAPI() // ← IMPORTANT: Load fee balances for fee calculations
          ]);
          
          const parentId = currentUser?.linked_id;
          
          //console.log('=== SETTINGS PAGE PARENT ID DEBUG ===');
          //console.log('Current user:', currentUser);
          //console.log('Parent ID from linked_id:', parentId);
          //console.log('Parent ID type:', typeof parentId);
          //console.log('Parent ID exists:', !!parentId);
          
          if (parentId) {
            // Load children via the parent-safe endpoint so we don't depend on /students or link lists.
            await getParentChildrenFromAPI(Number(parentId));
            //console.log('Settings Page - Fetching children for parent ID:', parentId);
            //console.log('Settings Page - Available parent-student links:', parentStudentLinks);
            //console.log('Settings Page - Available students:', students);
            //console.log('Settings Page - Data loaded check - links length:', parentStudentLinks.length, 'students length:', students.length);
            
            const parent = parents.find(p => p.id === currentUser.linked_id);
            if (parent) {
              setProfileData({
                id: parent.id,
                firstName: parent.firstName || '',
                lastName: parent.lastName || '',
                email: parent.email || '',
                phone: parent.phone || '',
                address: parent.address || '',
                occupation: parent.occupation || '',
                workplace: '',
                relationship: '',
                emergencyContact: '',
                emergencyPhone: '',
                profilePicture: '',
                communicationPreferences: {
                  email: true,
                  sms: true,
                  push: true,
                  whatsapp: false
                },
                privacySettings: {
                  shareContactInfo: true,
                  shareEmergencyInfo: true,
                  allowPhotoSharing: false
                }
              });
            }
          } else {
            //console.log('=== SETTINGS PAGE - NO PARENT ID FOUND ===');
            //console.log('Current user:', currentUser);
            //console.log('User linked_id:', currentUser?.linked_id);
          }
        } catch (error) {
          //console.error("Error loading parent data:", error);
          toast.error("Failed to load parent data");
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadParentData();
  }, [currentUser?.id, currentUser?.linked_id]);

  const handleProfileUpdate = async () => {
    if (!profileData.firstName || !profileData.lastName || !profileData.email || !profileData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await updateParent(profileData.id, profileData);
      toast.success('Profile updated successfully');
    } catch (error) {
      //console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    try {
      // Password update functionality would need to be implemented
      toast.error('Password update functionality not available');
      setShowPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      //console.error('Error changing password:', error);
      toast.error('Failed to change password. Please check your current password.');
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Profile picture must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfilePicture(result);
        setProfileData(prev => ({ ...prev, profilePicture: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCommunicationPreferenceChange = (key: string, value: boolean) => {
    setProfileData(prev => ({
      ...prev,
      communicationPreferences: {
        ...prev.communicationPreferences,
        [key]: value
      }
    }));
  };

  const handlePrivacySettingChange = (key: string, value: boolean) => {
    setProfileData(prev => ({
      ...prev,
      privacySettings: {
        ...prev.privacySettings,
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your profile and account preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'communication', label: 'Communication', icon: Bell },
            { id: 'privacy', label: 'Privacy', icon: Shield },
            { id: 'security', label: 'Security', icon: Lock }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Upload a profile picture</p>
                  <p className="text-xs text-gray-500">JPG, PNG or GIF. Max 5MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={profileData.address}
                  onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter home address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={profileData.occupation}
                    onChange={(e) => setProfileData(prev => ({ ...prev, occupation: e.target.value }))}
                    placeholder="Enter occupation"
                  />
                </div>
                <div>
                  <Label htmlFor="workplace">Workplace</Label>
                  <Input
                    id="workplace"
                    value={profileData.workplace}
                    onChange={(e) => setProfileData(prev => ({ ...prev, workplace: e.target.value }))}
                    placeholder="Enter workplace"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="relationship">Relationship to Student</Label>
                <Select value={profileData.relationship} onValueChange={(value) => setProfileData(prev => ({ ...prev, relationship: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="uncle">Uncle</SelectItem>
                    <SelectItem value="aunt">Aunt</SelectItem>
                    <SelectItem value="grandparent">Grandparent</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                <Input
                  id="emergencyContact"
                  value={profileData.emergencyContact}
                  onChange={(e) => setProfileData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  placeholder="Enter emergency contact name"
                />
              </div>
              <div>
                <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  value={profileData.emergencyPhone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                  placeholder="Enter emergency contact phone"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleProfileUpdate} disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      {/* Communication Tab */}
      {activeTab === 'communication' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Communication Preferences</h3>
              <p className="text-sm text-gray-600">Choose how you'd like to receive notifications from the school</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                  </div>
                  <Button
                    variant={profileData.communicationPreferences.email ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCommunicationPreferenceChange('email', !profileData.communicationPreferences.email)}
                  >
                    {profileData.communicationPreferences.email ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">SMS Notifications</p>
                      <p className="text-sm text-gray-600">Receive text messages</p>
                    </div>
                  </div>
                  <Button
                    variant={profileData.communicationPreferences.sms ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCommunicationPreferenceChange('sms', !profileData.communicationPreferences.sms)}
                  >
                    {profileData.communicationPreferences.sms ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Push Notifications</p>
                      <p className="text-sm text-gray-600">Receive in-app notifications</p>
                    </div>
                  </div>
                  <Button
                    variant={profileData.communicationPreferences.push ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCommunicationPreferenceChange('push', !profileData.communicationPreferences.push)}
                  >
                    {profileData.communicationPreferences.push ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">WhatsApp Notifications</p>
                      <p className="text-sm text-gray-600">Receive messages via WhatsApp</p>
                    </div>
                  </div>
                  <Button
                    variant={profileData.communicationPreferences.whatsapp ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCommunicationPreferenceChange('whatsapp', !profileData.communicationPreferences.whatsapp)}
                  >
                    {profileData.communicationPreferences.whatsapp ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleProfileUpdate} disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
              <p className="text-sm text-gray-600">Control how your information is shared</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Share Contact Information</p>
                      <p className="text-sm text-gray-600">Allow other parents to see your contact details</p>
                    </div>
                  </div>
                  <Button
                    variant={profileData.privacySettings.shareContactInfo ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePrivacySettingChange('shareContactInfo', !profileData.privacySettings.shareContactInfo)}
                  >
                    {profileData.privacySettings.shareContactInfo ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Share Emergency Information</p>
                      <p className="text-sm text-gray-600">Allow school staff to access emergency contact details</p>
                    </div>
                  </div>
                  <Button
                    variant={profileData.privacySettings.shareEmergencyInfo ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePrivacySettingChange('shareEmergencyInfo', !profileData.privacySettings.shareEmergencyInfo)}
                  >
                    {profileData.privacySettings.shareEmergencyInfo ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Camera className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Allow Photo Sharing</p>
                      <p className="text-sm text-gray-600">Allow school to share photos of your children in school activities</p>
                    </div>
                  </div>
                  <Button
                    variant={profileData.privacySettings.allowPhotoSharing ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePrivacySettingChange('allowPhotoSharing', !profileData.privacySettings.allowPhotoSharing)}
                  >
                    {profileData.privacySettings.allowPhotoSharing ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your privacy is important to us. We only share information with authorized school personnel and other parents when you explicitly allow it.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button onClick={handleProfileUpdate} disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Privacy Settings'}
            </Button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
              <p className="text-sm text-gray-600">Manage your account security</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Password</p>
                      <p className="text-sm text-gray-600">Change your account password</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordDialog(true)}
                  >
                    Change Password
                  </Button>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="h-5 w-5 text-gray-600" />
                  <p className="font-medium text-gray-900">Account Security Tips</p>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Use a strong password with at least 8 characters</li>
                  <li>• Include numbers, and special characters</li>
                  <li>• Don't share your password with anyone</li>
                  <li>• Change your password regularly</li>
                  <li>• Log out after using shared devices</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Update your account password for security purposes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePasswordChange} disabled={saving}>
                {saving ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
