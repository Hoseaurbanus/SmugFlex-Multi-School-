import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { useSchool } from '../contexts/SchoolContext';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  staffId: string;
  department: string;
  address: string;
}

interface SecurityData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  resultApproval: boolean;
}

export function ProfileSettingsPage() {
  const { currentUser, changePassword, updateTeacher, updateParent, updateAccountant } = useSchool();
  
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    staffId: '',
    department: '',
    address: '',
  });

  const [securityData, setSecurityData] = useState<SecurityData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    resultApproval: true,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleProfileUpdate = async () => {
    if (!currentUser) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      // Update based on user role
      if (currentUser.role === 'teacher') {
        await updateTeacher(currentUser.linked_id, {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          phone: profileData.phone,
        });
      } else if (currentUser.role === 'parent') {
        await updateParent(currentUser.linked_id, {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          phone: profileData.phone,
        });
      } else if (currentUser.role === 'accountant') {
        await updateAccountant(currentUser.linked_id, {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          phone: profileData.phone,
        });
      }

      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (securityData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      const success = await changePassword(securityData.currentPassword, securityData.newPassword);
      if (success) {
        toast.success('Password changed successfully');
        setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error('Current password is incorrect');
      }
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Notification settings updated');
  };

  const getInitials = () => {
    return `${profileData.firstName[0]}${profileData.lastName[0]}`.toUpperCase();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#0A2540] mb-2">Profile Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Profile Card */}
      <Card className="border-[#0A2540]/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 bg-[#0A2540] text-white text-2xl">
                <AvatarFallback className="bg-[#0A2540] text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="sm" 
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#0A2540] p-0"
              >
                <span className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1">
              <h2 className="text-[#0A2540]">{profileData.firstName} {profileData.lastName}</h2>
              <p className="text-gray-600">{profileData.role} • {profileData.staffId}</p>
              <p className="text-sm text-gray-500 mt-1">{profileData.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-[#0A2540]/5 p-1 rounded-xl">
          <TabsTrigger value="profile" className="rounded-xl data-[state=active]:bg-[#0A2540] data-[state=active]:text-white">
            <span className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl data-[state=active]:bg-[#0A2540] data-[state=active]:text-white">
            <span className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl data-[state=active]:bg-[#0A2540] data-[state=active]:text-white">
            <span className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="border-[#0A2540]/10">
            <CardHeader className="border-b border-[#0A2540]/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#0A2540]">Personal Information</CardTitle>
                  <CardDescription>Update your personal details and contact information</CardDescription>
                </div>
                {!isEditing ? (
                  <Button 
                    onClick={() => setIsEditing(true)}
                    className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl"
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      className="rounded-xl border-[#0A2540]/20"
                    >
                      <span className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleProfileUpdate}
                      disabled={isLoading}
                      className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#0A2540] rounded-xl"
                    >
                      <span className="w-4 h-4 mr-2" />
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-[#0A2540]">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    disabled={!isEditing}
                    className="border-[#0A2540]/20 rounded-xl disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-[#0A2540]">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    disabled={!isEditing}
                    className="border-[#0A2540]/20 rounded-xl disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#0A2540]">Email Address</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10 border-[#0A2540]/20 rounded-xl disabled:opacity-60"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[#0A2540]">Phone Number</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10 border-[#0A2540]/20 rounded-xl disabled:opacity-60"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staffId" className="text-[#0A2540]">Staff ID</Label>
                  <Input
                    id="staffId"
                    value={profileData.staffId}
                    disabled
                    className="border-[#0A2540]/20 rounded-xl opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-[#0A2540]">Department</Label>
                  <Input
                    id="department"
                    value={profileData.department}
                    disabled
                    className="border-[#0A2540]/20 rounded-xl opacity-60"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="text-[#0A2540]">Address</Label>
                  <Input
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    disabled={!isEditing}
                    className="border-[#0A2540]/20 rounded-xl disabled:opacity-60"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="border-[#0A2540]/10">
            <CardHeader className="border-b border-[#0A2540]/10">
              <CardTitle className="text-[#0A2540]">Security Settings</CardTitle>
              <CardDescription>Manage your password and account security</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Change Password */}
                <div className="space-y-4">
                  <h3 className="text-[#0A2540]">Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-[#0A2540]">Current Password</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="currentPassword"
                          type="password"
                          value={securityData.currentPassword}
                          onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                          className="pl-10 border-[#0A2540]/20 rounded-xl"
                          placeholder="Enter current password"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-[#0A2540]">New Password</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="newPassword"
                          type="password"
                          value={securityData.newPassword}
                          onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                          className="pl-10 border-[#0A2540]/20 rounded-xl"
                          placeholder="Enter new password"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-[#0A2540]">Confirm New Password</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={securityData.confirmPassword}
                          onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                          className="pl-10 border-[#0A2540]/20 rounded-xl"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handlePasswordChange}
                      disabled={isLoading}
                      className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl"
                    >
                      {isLoading ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Two-Factor Authentication */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[#0A2540]">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Separator />

                {/* Session Management */}
                <div className="space-y-4">
                  <h3 className="text-[#0A2540]">Active Sessions</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-[#0A2540]">Windows • Chrome</p>
                        <p className="text-sm text-gray-600">Gombe, Nigeria • Active now</p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl border-[#0A2540]/20">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="border-[#0A2540]/10">
            <CardHeader className="border-b border-[#0A2540]/10">
              <CardTitle className="text-[#0A2540]">Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Email & SMS */}
                <div className="space-y-4">
                  <h3 className="text-[#0A2540]">Communication Channels</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 text-[#0A2540]" />
                        <div>
                          <p className="text-[#0A2540]">Email Notifications</p>
                          <p className="text-sm text-gray-600">Receive notifications via email</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifications.emailNotifications}
                        onCheckedChange={() => handleNotificationToggle('emailNotifications')}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 text-[#0A2540]" />
                        <div>
                          <p className="text-[#0A2540]">SMS Notifications</p>
                          <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifications.smsNotifications}
                        onCheckedChange={() => handleNotificationToggle('smsNotifications')}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Activity Notifications */}
                <div className="space-y-4">
                  <h3 className="text-[#0A2540]">Activity Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-[#0A2540]">Result Approval</p>
                        <p className="text-sm text-gray-600">Get notified when results are pending approval</p>
                      </div>
                      <Switch 
                        checked={notifications.resultApproval}
                        onCheckedChange={() => handleNotificationToggle('resultApproval')}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-[#0A2540]">Payment Alerts</p>
                        <p className="text-sm text-gray-600">Get notified about payment activities</p>
                      </div>
                      <Switch 
                        checked={notifications.resultApproval}
                        onCheckedChange={() => handleNotificationToggle('resultApproval')}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-[#0A2540]">Email Notifications</p>
                        <p className="text-sm text-gray-600">Receive notifications via email</p>
                      </div>
                      <Switch 
                        checked={notifications.emailNotifications}
                        onCheckedChange={() => handleNotificationToggle('emailNotifications')}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-[#0A2540]">SMS Notifications</p>
                        <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                      </div>
                      <Switch 
                        checked={notifications.smsNotifications}
                        onCheckedChange={() => handleNotificationToggle('smsNotifications')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
