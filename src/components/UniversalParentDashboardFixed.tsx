// Parent Dashboard Component - Main interface for parent users
import { useState, useEffect } from "react";
import { LayoutDashboard, Users, Calendar, Bell, Settings, User, CheckCircle, BookOpen, Award, TrendingUp, Download, Eye, Search, Filter, Mail, Phone, Lock, CreditCard, FileText, Clock, AlertCircle, Check, X, Edit2, Save, RefreshCw, Banknote, Upload } from 'lucide-react';
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { toast } from "sonner";
import { useSchool } from "../contexts/SchoolContext";
import { connectionMonitor } from "../utils/connectionMonitor";
import { MyChildrenPage } from "./parent/MyChildrenPage";
import { API_CONFIG } from "../config/api";

interface ParentDashboardProps {
  onLogout: () => void;
}

interface Child {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  admissionNumber: string;
  className: string;
  classLevel: string;
  gender: string;
  photoUrl?: string;
  dateOfBirth: string;
  address: string;
  parentContact: string;
  enrollmentDate: string;
  status: string;
  recentActivities: any[];
  feeBalance: number;
  totalFees: number;
}

export function UniversalParentDashboardFixed({ onLogout }: ParentDashboardProps) {
  const { 
    currentUser, 
    parents, 
    getParentChildren,
    getUnreadNotifications, 
    notifications, 
    currentTerm, 
    currentAcademicYear,
    loadParentsFromAPI,
    loadParentStudentLinksFromAPI,
    loadStudentsFromAPI,
    compiledResults,
    getCompiledResults,
    loadCompiledResultsFromAPI,
    studentFeeBalances,
    payments,
    markNotificationAsRead,
    updateParent,
    addNotification,
    parentStudentLinks
  } = useSchool();
  
  const [activeItem, setActiveItem] = useState("dashboard");

  // Connection monitoring for parents
  useEffect(() => {
    let isMounted = true;
    
    const checkConnection = () => {
      if (!isMounted) return;
      
      if (!connectionMonitor.isHealthy()) {
        toast.warning('Connection issues detected. Attempting to reconnect...');
        connectionMonitor.forceReconnect().then(success => {
          if (isMounted && success) {
            toast.success('Connection restored');
          } else if (isMounted) {
            toast.error('Connection failed. Please refresh the page.');
          }
        });
      }
    };
    
    // Check connection every 2 minutes
    const interval = setInterval(checkConnection, 120000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: ""
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [messageData, setMessageData] = useState({
    subject: "",
    message: "",
    recipient: "admin"
  });
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");

  const currentParent = currentUser && parents.length > 0 ? parents.find((p) => p.id === currentUser?.linked_id) : null;
  
  let parentName = currentUser?.username || "Parent";
  if (currentParent && currentParent.firstName && currentParent.lastName) {
    parentName = `${currentParent.firstName} ${currentParent.lastName}`;
  }
  
  const unreadCount = currentUser ? getUnreadNotifications().length : 0;

  // Get approved results for linked children
  const getApprovedResultsForChildren = () => {
    if (!children.length || !compiledResults.length) return [];
    
    // Debug logging
    console.log('Children:', children.map(c => ({ id: c.id, name: c.fullName })));
    console.log('Compiled Results:', compiledResults.map(r => ({ 
      id: r.id, 
      student_id: r.student_id, 
      status: r.status,
      term: r.term 
    })));
    
    const approvedResults = compiledResults.filter(result => 
      result.status === 'Approved' && 
      children.some(child => child.id === result.student_id)
    );
    
    console.log('Filtered Approved Results:', approvedResults);
    return approvedResults;
  };

  const approvedResults = getApprovedResultsForChildren();

  const handleViewResult = (resultId: number) => {
    toast.success(`Opening approved result details for ID: ${resultId}`);
  };

  const handleDownloadResult = (resultId: number) => {
    toast.success(`Downloading PDF result for ID: ${resultId}`);
    // In a real implementation, this would generate and download a PDF
  };

  // Profile management functions
  const handleSaveProfile = async () => {
    if (!currentParent) return;
    
    try {
      await updateParent(currentParent.id, profileData);
      setEditingProfile(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    try {
      // In a real implementation, this would call an API to change password
      toast.success("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error("Failed to change password");
    }
  };

  const handleSendMessage = async () => {
    if (!messageData.subject.trim() || !messageData.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      await addNotification({
        title: messageData.subject,
        message: `Message from ${parentName}: ${messageData.message}`,
        type: 'info',
        targetAudience: messageData.recipient === 'admin' ? 'all' : 'teachers',
        sentBy: currentUser?.id || 0,
        sentDate: new Date().toISOString(),
        isRead: false,
        readBy: []
      });
      
      toast.success("Message sent successfully!");
      setMessageData({ subject: "", message: "", recipient: "admin" });
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const getFilteredNotifications = () => {
    const userNotifications = notifications.filter(n => 
      n.targetAudience === 'parents' || 
      (n.targetAudience === 'all') ||
      (n.sentBy && n.sentBy === currentUser?.id)
    );
    
    if (notificationFilter === 'unread') {
      return userNotifications.filter(n => !n.readBy.includes(currentUser?.id || 0));
    } else if (notificationFilter === 'read') {
      return userNotifications.filter(n => n.readBy.includes(currentUser?.id || 0));
    }
    
    return userNotifications;
  };

  const handleMakePayment = (child: Child) => {
    setSelectedChild(child);
    setPaymentAmount(child.feeBalance || 0);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedChild || !paymentAmount || paymentAmount <= 0) {
      toast.error("Please select a student and enter a valid amount");
      return;
    }

    try {
      toast.loading("Initializing payment...");

      const initResponse = await fetch(`${API_CONFIG.BASE_URL}/payments/online-init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          student_id: selectedChild.id,
          amount: paymentAmount,
          payment_type: 'School Fees',
          term: currentTerm || 'First Term',
          academic_year: currentAcademicYear || '2024/2025',
          notes: `Online payment by parent for ${selectedChild.fullName}`
        })
      });

      if (!initResponse.ok) {
        const error = await initResponse.json();
        throw new Error(error.message || 'Failed to initialize payment');
      }

      const initData = await initResponse.json();
      const { reference } = initData.data;

      toast.dismiss();
      toast.loading("Opening payment window...");

      const PaystackInline = await import('@paystack/inline-js');
      const paystack = new PaystackInline.default();
      
      paystack.checkout({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: currentParent?.email || '',
        amount: paymentAmount * 100,
        reference: reference,
        onSuccess: async (response: any) => {
          try {
            toast.dismiss();
            toast.loading("Verifying payment...");

            const verifyResponse = await fetch(`${API_CONFIG.BASE_URL}/payments/online-verify?reference=${response.reference}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });

            if (!verifyResponse.ok) {
              const error = await verifyResponse.json();
              throw new Error(error.message || 'Payment verification failed');
            }

            const verifyData = await verifyResponse.json();
            
            toast.dismiss();
            toast.success(`Payment successful! Receipt: ${verifyData.data.receipt_number}`);

            // Refresh parent data to update payment and fee information
            window.location.reload();

            setIsPaymentModalOpen(false);
            setPaymentAmount(0);
            setSelectedChild(null);
            setPaymentMethod("card");

          } catch (verifyError: any) {
            toast.dismiss();
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        onCancel: () => {
          toast.dismiss();
          toast.info('Payment cancelled. You can try again anytime.');
        }
      });

    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Payment failed. Please try again.');
    }
  };




  const renderNotificationsPage = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Notifications</h1>
        <p className="text-[#6B7280]">View and manage your notifications</p>
      </div>

      {/* Notification Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={notificationFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setNotificationFilter('all')}
            >
              All Notifications
            </Button>
            <Button
              variant={notificationFilter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setNotificationFilter('unread')}
            >
              Unread ({getFilteredNotifications().filter(n => !n.readBy.includes(currentUser?.id || 0)).length})
            </Button>
            <Button
              variant={notificationFilter === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setNotificationFilter('read')}
            >
              Read
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {getFilteredNotifications().length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">
                {notificationFilter === 'unread' ? 'No unread notifications' : 'No notifications found'}
              </p>
            </CardContent>
          </Card>
        ) : (
          getFilteredNotifications().map((notification) => (
            <Card key={notification.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                      <Badge variant={notification.type === 'success' ? 'default' : 'secondary'}>
                        {notification.type}
                      </Badge>
                      {!notification.readBy.includes(currentUser?.id || 0) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{notification.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(notification.sentDate || new Date()).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!notification.readBy.includes(currentUser?.id || 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderSettingsPage = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Settings</h1>
        <p className="text-[#6B7280]">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Profile Settings</h3>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                    disabled={!editingProfile}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                    disabled={!editingProfile}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  disabled={!editingProfile}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  disabled={!editingProfile}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={profileData.address}
                  onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                  disabled={!editingProfile}
                />
              </div>
              <div className="flex gap-2">
                {editingProfile ? (
                  <>
                    <Button onClick={() => {
                      toast.success("Saving profile changes");
                      handleSaveProfile();
                    }}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => {
                      toast.success("Cancelling profile edit");
                      setEditingProfile(false);
                    }}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => {
                    toast.success("Entering edit profile mode");
                    setEditingProfile(true);
                  }}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Password Settings</h3>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                />
              </div>
              <Button onClick={() => {
                toast.success("Changing password");
                handleChangePassword();
              }} className="w-full">
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Communication Settings */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Send Message</h3>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient">Recipient</Label>
                <Select value={messageData.recipient} onValueChange={(value) => setMessageData({...messageData, recipient: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">School Administration</SelectItem>
                    <SelectItem value="teachers">Teachers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={messageData.subject}
                  onChange={(e) => setMessageData({...messageData, subject: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={messageData.message}
                  onChange={(e) => setMessageData({...messageData, message: e.target.value})}
                  placeholder="Type your message here..."
                />
              </div>
              <Button onClick={() => {
                toast.success("Sending message to administration");
                handleSendMessage();
              }} className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Account Status</p>
                <Badge variant={currentParent?.status === "Active" ? "default" : "secondary"}>
                  {currentParent?.status || "Unknown"}
                </Badge>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Username</p>
                <p className="text-gray-900 font-medium">{currentUser?.username}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Parent ID</p>
                <p className="text-gray-900 font-medium">{currentUser?.linked_id}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Linked Children</p>
                <p className="text-gray-900 font-medium">{children.length} student(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  useEffect(() => {
    const loadParentData = async () => {
      if (currentUser && currentUser.role === "parent") {
        setLoading(true);
        try {
          await Promise.all([
            loadParentsFromAPI(),
            loadParentStudentLinksFromAPI(),
            loadStudentsFromAPI(),
            loadCompiledResultsFromAPI()
          ]);

          const parentId = currentUser?.linked_id;
          
          console.log('=== PARENT DASHBOARD CHILDREN LOADING DEBUG ===');
          console.log('Current user:', currentUser);
          console.log('Parent ID:', parentId);
          console.log('Parent-student links available:', parentStudentLinks.length);
          console.log('Parent-student links data:', parentStudentLinks);
          
          if (parentId) {
            const childrenData = getParentChildren(parentId);
            console.log('Children data from getParentChildren:', childrenData);
            
            if (childrenData && childrenData.length > 0) {
              const transformedChildren = childrenData.map((child: any) => ({
                ...child,
                dateOfBirth: child.dateOfBirth || "",
                address: child.address || "",
                parentContact: child.parentContact || "",
                enrollmentDate: child.enrollmentDate || "",
                recentActivities: child.recentActivities || [],
                feeBalance: child.feeBalance || 0,
                totalFees: child.totalFees || 0
              }));
              setChildren(transformedChildren);
            } else {
              setChildren([]);
              toast.info(`No linked students found for ${parentName}. Please contact administration to link students.`);
            }
          } else {
            setChildren([]);
            toast.error("Parent account not properly linked");
          }
        } catch (error) {
          console.error("Error loading parent data:", error);
          toast.error("Failed to load parent data");
          setChildren([]);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadParentData();
  }, [currentUser?.id, currentUser?.linked_id, parents.length]);

  // Initialize profile data when currentParent changes
  useEffect(() => {
    if (currentParent) {
      setProfileData({
        firstName: currentParent.firstName || "",
        lastName: currentParent.lastName || "",
        email: currentParent.email || "",
        phone: currentParent.phone || "",
        address: currentParent.address || ""
      });
    }
  }, [currentParent]);

  const renderDashboard = () => (
    <div className="p-4 md:p-6 space-y-6">
      {/* Simple Welcome Header */}
      <div className="bg-blue-600 rounded-xl p-4 md:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
                  Welcome back, <span className="text-yellow-200">{parentName}</span>
                </h1>
                <p className="text-white text-sm md:text-base mt-1">
                  Parent Dashboard
                </p>
              </div>
            </div>
            <p className="text-white text-sm md:text-base max-w-xl">
              Track your children's academic progress and view results
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="bg-blue-700 rounded-lg px-3 py-1.5">
                <span className="text-xs font-medium text-white">{currentAcademicYear || "2025/2026"}</span>
              </div>
              <div className="bg-blue-700 rounded-lg px-3 py-1.5">
                <span className="text-xs font-medium text-white">{currentTerm || "First"}</span>
              </div>
            </div>
          </div>
          
          {/* Compact Stats Cards */}
          <div className="flex gap-3 lg:flex-col">
            <div className="bg-blue-700 rounded-xl p-4 text-center min-w-[100px]">
              <Users className="w-6 h-6 text-white mx-auto mb-2" />
              <div className="text-xl md:text-2xl font-bold text-white">{children.length}</div>
              <p className="text-white text-xs font-medium">Children</p>
            </div>
            <div className="bg-blue-700 rounded-xl p-4 text-center min-w-[100px]">
              <Bell className="w-6 h-6 text-white mx-auto mb-2" />
              <div className="text-xl md:text-2xl font-bold text-white">{unreadCount}</div>
              <p className="text-white text-xs font-medium">Notifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-xs font-semibold text-blue-900">My Children</h3>
              <p className="text-xs text-blue-600">Linked students</p>
            </div>
            <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl font-bold text-blue-900">{children.length}</div>
            <div className="mt-1 flex items-center text-xs text-blue-600">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5 animate-pulse"></div>
              Active accounts
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-xs font-semibold text-green-900">Current Term</h3>
              <p className="text-xs text-green-600">Academic period</p>
            </div>
            <div className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl font-bold text-green-900">{currentTerm || "First"}</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
              {currentAcademicYear || "2025/2026"}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-amber-50 to-orange-100 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-xs font-semibold text-amber-900">Notifications</h3>
              <p className="text-xs text-amber-600">Unread messages</p>
            </div>
            <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform relative">
              <Bell className="h-4 w-4 text-amber-600" />
              {unreadCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl font-bold text-amber-900">{unreadCount}</div>
            <div className="mt-1 flex items-center text-xs text-amber-600">
              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${unreadCount > 0 ? 'bg-amber-400 animate-pulse' : 'bg-gray-300'}`}></div>
              {unreadCount > 0 ? 'New messages' : 'All caught up'}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-purple-100 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-0.5">
              <h3 className="text-xs font-semibold text-purple-900">Profile Status</h3>
              <p className="text-xs text-purple-600">Account status</p>
            </div>
            <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl font-bold text-purple-900">Active</div>
            <div className="mt-1 flex items-center text-xs text-purple-600">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-1.5 animate-pulse"></div>
              Account verified
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Overview Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Children Overview Widget */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900">Children Overview</h3>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {children.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No children linked to your account</p>
                <Button variant="outline" size="sm" className="mt-2 text-xs">
                  Contact School Admin
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {children.slice(0, 3).map((child) => (
                  <div key={child.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                        {child.photoUrl ? (
                          <img src={child.photoUrl} alt={child.fullName} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <User className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{child.fullName}</p>
                        <p className="text-xs text-gray-500">{child.className}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-blue-600">
                      View
                    </Button>
                  </div>
                ))}
                {children.length > 3 && (
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    View All {children.length} Children
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Results Widget */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              <h3 className="text-base font-semibold text-gray-900">Recent Results</h3>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {approvedResults.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No approved results available</p>
                <p className="text-xs text-gray-400 mt-1">Results will appear here once approved</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvedResults.slice(0, 3).map((result) => {
                  const child = children.find(c => c.id === result.student_id);
                  if (!child) return null;
                  
                  return (
                    <div key={result.id} className="p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{child.fullName}</p>
                          <p className="text-xs text-gray-500">{result.term} â€¢ {result.average_score || 'N/A'}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          {result.average_score ? 'View' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {approvedResults.length > 3 && (
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    View All {approvedResults.length} Results
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fee Status Widget */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <h3 className="text-base font-semibold text-gray-900">Fee Status</h3>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {(() => {
              // Calculate real fee data for current parent's children
              const currentTermFees = studentFeeBalances.filter(balance => 
                balance.term === currentTerm && 
                balance.academic_year === currentAcademicYear &&
                children.some(child => child.id === balance.student_id)
              );
              
              const totalFees = currentTermFees.reduce((sum, fee) => sum + fee.total_fee_required, 0);
              const totalPaid = currentTermFees.reduce((sum, fee) => sum + fee.total_paid, 0);
              const totalOutstanding = currentTermFees.reduce((sum, fee) => sum + fee.balance, 0);
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Total Fees</p>
                      <p className="text-xs text-gray-500">Academic Year {currentAcademicYear || "2025/2026"}</p>
                    </div>
                    <p className="text-lg font-bold text-purple-900">â‚¦{totalFees.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Paid</p>
                      <p className="text-xs text-gray-500">This term</p>
                    </div>
                    <p className="text-lg font-bold text-green-900">â‚¦{totalPaid.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Outstanding</p>
                      <p className="text-xs text-gray-500">Due this month</p>
                    </div>
                    <p className="text-lg font-bold text-orange-900">â‚¦{totalOutstanding.toLocaleString()}</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    View Fee History
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Make Payment
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Make Payment
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Make Payment
                  </Button>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100 border-b">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-600" />
            <h3 className="text-base font-semibold text-gray-900">Quick Actions</h3>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="flex flex-col items-center gap-2 h-16 p-3 hover:bg-blue-50"
              onClick={() => setActiveItem('children')}
            >
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span className="text-xs">View Children</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col items-center gap-2 h-16 p-3 hover:bg-green-50"
              onClick={() => setActiveItem('children')}
            >
              <Award className="h-5 w-5 text-green-600" />
              <span className="text-xs">Results</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col items-center gap-2 h-16 p-3 hover:bg-purple-50"
              onClick={() => setActiveItem('settings')}
            >
              <Settings className="h-5 w-5 text-purple-600" />
              <span className="text-xs">Settings</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col items-center gap-2 h-16 p-3 hover:bg-amber-50"
              onClick={() => setActiveItem('notifications')}
            >
              <Bell className="h-5 w-5 text-amber-600" />
              <span className="text-xs">Notifications</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modern Parent Information */}
      {currentParent && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">Parent Information</h3>
              <p className="text-sm text-gray-600">Your account and contact details</p>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Personal Details</h4>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Full Name</p>
                    <p className="text-gray-900 font-medium text-sm">{parentName}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Email Address</p>
                    <p className="text-gray-900 font-medium text-sm">{currentParent.email}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Phone Number</p>
                    <p className="text-gray-900 font-medium text-sm">{currentParent.phone}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Account Details</h4>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Account Status</p>
                    <Badge variant={currentParent.status === "Active" ? "default" : "secondary"} className="text-xs">
                      {currentParent.status}
                    </Badge>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Username</p>
                    <p className="text-gray-900 font-medium text-sm">{currentUser?.username}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Parent ID</p>
                    <p className="text-gray-900 font-medium text-sm">{currentUser?.linked_id}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderFeesPage = () => {
    try {
      const totalOutstanding = children.reduce(
        (sum, child) => sum + (child.feeBalance || 0),
        0
      );
      const totalPaid = children.reduce(
        (sum, child) => sum + ((child.totalFees || 0) - (child.feeBalance || 0)),
        0
      );
      const currentTermFees = children.reduce(
        (sum, child) => sum + (child.totalFees || 0),
        0
      );

      const safePayments = Array.isArray(payments) ? payments : [];
      const childIdSet = new Set(children.map((child) => child.id));
      const parentPayments = safePayments
        .filter((payment) => payment && childIdSet.has(payment.student_id))
        .sort(
          (a, b) =>
            new Date(b.recorded_date).getTime() -
            new Date(a.recorded_date).getTime()
        )
        .slice(0, 5);

      return (
        <div className="space-y-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Fee Management</h1>
            <p className="text-gray-600">View and manage fee payments for your children</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-blue-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Outstanding</p>
                    <p className="text-2xl font-bold text-blue-800">â‚¦{totalOutstanding.toLocaleString()}</p>
                    <p className="text-xs text-blue-500 mt-1">Across all children</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-green-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Paid</p>
                    <p className="text-2xl font-bold text-green-800">â‚¦{totalPaid.toLocaleString()}</p>
                    <p className="text-xs text-green-500 mt-1">Total payments made</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-purple-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Current Term Fees</p>
                    <p className="text-2xl font-bold text-purple-800">â‚¦{currentTermFees.toLocaleString()}</p>
                    <p className="text-xs text-purple-500 mt-1">For current term</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-r from-orange-50 to-orange-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Payment Status</p>
                    <p className="text-2xl font-bold text-orange-800">
                      {children.length > 0 ? 
                        `${children.filter(c => {
                          const balance = c.totalFees - (c.totalFees * 0.7); // Assuming 70% paid
                          return balance <= 0;
                        }).length}/${children.length}` : '0/0'
                      }
                    </p>
                    <p className="text-xs text-orange-500 mt-1">Children paid</p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-100">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Fee Breakdown by Child</h2>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  <span>Download Statement</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Child</TableHead>
                      <TableHead className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fees</TableHead>
                      <TableHead className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</TableHead>
                      <TableHead className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</TableHead>
                      <TableHead className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {children.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center text-sm text-gray-500">
                          No linked students found. Fee information will appear here once your children are linked.
                        </TableCell>
                      </TableRow>
                    ) : (
                      children.map((child) => {
                        const paid = (child.totalFees || 0) - (child.feeBalance || 0);
                        const balance = child.feeBalance || 0;
                        const status =
                          balance <= 0
                            ? "Paid"
                            : balance === (child.totalFees || 0)
                            ? "Unpaid"
                            : "Partial";

                        return (
                          <TableRow key={child.id} className="hover:bg-gray-50">
                            <TableCell className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                  <User className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{child.fullName}</div>
                                  <div className="text-sm text-gray-500">{child.className || "Class N/A"}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                              â‚¦{(child.totalFees || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                              â‚¦{paid.toLocaleString()}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <span className={balance > 0 ? "text-red-600" : "text-green-600"}>
                                â‚¦{balance.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  status === "Paid"
                                    ? "bg-green-100 text-green-800"
                                    : status === "Unpaid"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {status}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button
                                variant="outline"
                                size="sm"
                                className="mr-2"
                                onClick={() => handleMakePayment(child)}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                              <Button variant="ghost" size="sm">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm mt-6">
            <CardHeader className="border-b">
              <h2 className="text-lg font-semibold text-gray-800">Recent Transactions</h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Child</TableHead>
                      <TableHead className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</TableHead>
                      <TableHead className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parentPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-sm text-gray-500">
                          No payment history found yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      parentPayments.map((payment) => (
                        <TableRow key={payment.id} className="hover:bg-gray-50">
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.recorded_date
                              ? new Date(payment.recorded_date).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{payment.student_name}</div>
                            <div className="text-xs text-gray-500">
                              {payment.term} â€¢ {payment.academic_year}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-sm text-gray-900">
                            {payment.payment_type || "School Fees Payment"}
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                            â‚¦{Number(payment.amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                              <Download className="h-4 w-4" />
                              <span className="ml-1">Receipt</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Make Payment
                </DialogTitle>
                <DialogDescription>
                  {selectedChild
                    ? `Complete the payment for ${selectedChild.fullName}'s fees`
                    : "Select a student to make a payment"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {selectedChild && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{selectedChild.fullName}</p>
                        <p className="text-sm text-gray-500">{selectedChild.className || "Class N/A"}</p>
                        <p className="text-xs text-gray-400">Outstanding: â‚¦{(selectedChild.feeBalance || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium">Payment Amount (â‚¦)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount ? paymentAmount.toString() : ""}
                    onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                    className="text-lg font-semibold"
                  />
                  {selectedChild && paymentAmount > 0 && (
                    <p className="text-xs text-gray-500">
                      Remaining balance after payment: â‚¦{Math.max(0, (selectedChild.feeBalance || 0) - paymentAmount).toLocaleString()}
                    </p>
                  )}
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Payment Method</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      variant={paymentMethod === "card" ? "default" : "outline"}
                      onClick={() => setPaymentMethod("card")}
                      className="h-auto p-4 justify-start"
                    >
                      <CreditCard className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <p className="font-medium">Online Payment</p>
                        <p className="text-xs text-gray-500">Pay securely with card, bank transfer, or USSD</p>
                      </div>
                    </Button>
                    <Button
                      variant={paymentMethod === "transfer" ? "default" : "outline"}
                      onClick={() => setPaymentMethod("transfer")}
                      className="h-auto p-4 justify-start"
                    >
                      <Banknote className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <p className="font-medium">Bank Transfer</p>
                        <p className="text-xs text-gray-500">Transfer to school bank account</p>
                      </div>
                    </Button>
                  </div>
                </div>

                {paymentMethod === "transfer" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Bank Transfer Details</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p><strong>Bank:</strong> First Bank of Nigeria</p>
                      <p><strong>Account Name:</strong> Graceland Royal Academy</p>
                      <p><strong>Account Number:</strong> 1234567890</p>
                      <p className="text-xs mt-2">Please upload receipt after payment</p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePaymentSubmit}
                  disabled={!selectedChild || !paymentAmount || paymentAmount <= 0}
                  className="w-full sm:w-auto"
                >
                  {paymentMethod === "card" ? (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay â‚¦{paymentAmount ? paymentAmount.toLocaleString() : "0"}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Receipt
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    } catch (error) {
      console.error("Error rendering fees page:", error);
      return (
        <div className="space-y-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Fee Management</h1>
            <p className="text-gray-600">
              There was an error loading fee information. Please refresh the page or contact the school
              administration.
            </p>
          </div>
        </div>
      );
    }
  };

  const renderMessagesPage = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Messages</h1>
        <p className="text-[#6B7280]">Communicate with school administration</p>
      </div>
    </div>
  );

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: "children", label: "My Children", icon: <BookOpen className="h-5 w-5" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-5 w-5" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
    { id: "fees", label: "Fee Management", icon: <CreditCard className="h-5 w-5" /> },
    { id: "messages", label: "Messages", icon: <Mail className="h-5 w-5" /> },
  ];

  const handleItemClick = (id: string) => {
    // Add toast messages for navigation
    const toastMessages: Record<string, string> = {
      "dashboard": "Opening Dashboard",
      "children": "Opening My Children",
      "notifications": "Opening Notifications",
      "settings": "Opening Settings",
      "fees": "Opening Fee Management",
      "messages": "Opening Messages"
    };
    
    if (toastMessages[id]) {
      toast.success(toastMessages[id]);
    }
    setActiveItem(id);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardSidebar
        items={sidebarItems}
        activeItem={activeItem}
        onItemClick={handleItemClick}
      />

      <div className="lg:pl-64">
        <DashboardTopBar
          userName={parentName}
          userRole="parent"
          notificationCount={unreadCount}
          onNotificationClick={() => {}}
          onLogout={onLogout}
        />

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {activeItem === "dashboard" && renderDashboard()}
          {activeItem === "children" && <MyChildrenPage />}
          {activeItem === "notifications" && renderNotificationsPage()}
          {activeItem === "settings" && renderSettingsPage()}
          {activeItem === "fees" && renderFeesPage()}
          {activeItem === "messages" && renderMessagesPage()}
        </main>
      </div>
    </div>
  );
}



