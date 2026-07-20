// Parent Dashboard Component - Main interface for parent users
import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, Users, Calendar, Bell, Settings, User, CheckCircle, BookOpen, Award, TrendingUp, Download, Mail, Lock, CreditCard, FileText, Banknote, Upload, Printer, MessageCircle } from 'lucide-react';
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { toast } from "sonner";
import { useSchool } from "../contexts/SchoolContext";
import { connectionMonitor } from "../utils/connectionMonitor";
import { MyChildrenPage } from "./parent/MyChildrenPage";
import { API_CONFIG, getAuthToken } from "../config/api";
import { PaymentReceipt } from "./ui/PaymentReceipt";

// Naira symbol constant for reliable display
const NAIRA = "₦";

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
  class_id?: number; // Add optional class_id for WhatsApp groups
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
    getParentChildrenFromAPI,
    getUnreadNotifications, 
    notifications, 
    currentTerm, 
    currentAcademicYear,
    loadParentsFromAPI,
    loadClassesFromAPI,
    loadCompiledResultsFromAPI,
    loadSchoolSettings,
    compiledResults,
    payments,
    loadPaymentsFromAPI,
    markNotificationAsRead,
    updateParent,
    addNotification,
    deleteNotification,
    loadNotificationsFromAPI,
    classes,
    schoolSettings,
    loadFeeStructuresFromAPI,
    getStudentInvoice,
    users,
    changePassword
  } = useSchool();

  const getChildPhotoCandidates = (child: any): string[] => {
    const raw = child?.photoUrl || child?.photo_url || child?.photoURL;
    if (!raw || typeof raw !== 'string') return [];
    const trimmed = raw.trim();
    if (!trimmed) return [];

    if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return [trimmed];

    const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    let apiOrigin = '';
    try {
      apiOrigin = API_CONFIG?.BASE_URL ? new URL(API_CONFIG.BASE_URL).origin : '';
    } catch {
      apiOrigin = '';
    }

    const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;
    const candidates = [
      appOrigin ? `${appOrigin}${normalizedPath}` : '',
      apiOrigin ? `${apiOrigin}${normalizedPath}` : '',
      trimmed,
    ].filter(Boolean);

    return Array.from(new Set(candidates));
  };

  const handleChildPhotoError = (e: React.SyntheticEvent<HTMLImageElement>, child: any) => {
    const img = e.currentTarget;
    const candidates = getChildPhotoCandidates(child);
    const idx = Number(img.dataset.candidateIdx || '0');
    const nextIdx = idx + 1;
    if (nextIdx < candidates.length) {
      img.dataset.candidateIdx = String(nextIdx);
      img.src = candidates[nextIdx];
    }
  };
  
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
        }).catch(_error => {
          if (isMounted) {
            // Silent fail for security
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
  const [_retryScheduled, _setRetryScheduled] = useState(false); // Prevent multiple retries
  const [dataLoadedSuccessfully, setDataLoadedSuccessfully] = useState(false); // Track successful data load
  const dataLoadedRef = useRef(false); // Ref to track successful data load (not affected by state timing)
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
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [_loadingResults, _setLoadingResults] = useState(false);
  const [bankTransferReceipt, setBankTransferReceipt] = useState<File | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any>(null);

  const [invoiceSummaries, setInvoiceSummaries] = useState<Record<number, any>>({});

  const bootstrapKeyRef = useRef<string>('');

  // Load children data on mount and when parent links change
  useEffect(() => {
    const loadChildren = async () => {
      if (!currentUser || currentUser.role !== 'parent' || !currentUser.linked_id) {
        return;
      }

      const nextKey = String(currentUser.linked_id);
      if (bootstrapKeyRef.current === nextKey && dataLoadedRef.current) {
        return;
      }
      bootstrapKeyRef.current = nextKey;
      
      setLoading(true);
      try {
        // Parent bootstrap: keep it minimal and parent-safe to improve load time and stability.
        // Parents should not depend on loading the entire students list.
        await Promise.all([
          loadParentsFromAPI(),
          loadClassesFromAPI(),
          loadCompiledResultsFromAPI(),
          loadNotificationsFromAPI(),
          loadFeeStructuresFromAPI(),
          loadSchoolSettings(),
        ]);

        const parentId = currentUser.linked_id;
        
        // Try API first, fallback to context function
        const apiChildren = await getParentChildrenFromAPI?.(Number(parentId));
        const childrenData = Array.isArray(apiChildren) && apiChildren.length > 0
          ? apiChildren
          : getParentChildren(parentId);
        
        if (childrenData && childrenData.length > 0) {
          const transformedChildren = childrenData.map((child: any) => ({
            ...child,
            firstName: child.firstName ?? child.first_name ?? "",
            lastName: child.lastName ?? child.last_name ?? "",
            fullName: child.fullName ?? child.full_name ?? `${child.firstName ?? child.first_name ?? ''} ${child.lastName ?? child.last_name ?? ''}`.trim(),
            admissionNumber: child.admissionNumber ?? child.admission_number ?? "",
            className: child.className ?? child.class_name ?? "",
            class_id: child.class_id ?? child.classId ?? child.class_id,
            gender: child.gender ?? "",
            status: child.status ?? "Active",
            feeBalance: child.feeBalance ?? 0,
            totalFees: child.totalFees ?? 0
          }));
          setChildren(transformedChildren);
          setDataLoadedSuccessfully(true);
          dataLoadedRef.current = true;
        } else {
          setChildren([]);
        }
      } catch (error) {
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, [currentUser?.id, currentUser?.linked_id]);

  // Keep parent results fresh without requiring hard refresh / cache clearing.
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'parent') return;

    let intervalId: number | undefined;

    const refresh = async () => {
      try {
        await loadCompiledResultsFromAPI();
      } catch (e) {
        // Keep UI stable if refresh fails.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    refresh();
    intervalId = window.setInterval(refresh, 10000);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [currentUser?.id, currentUser?.role]);

  const getPendingOnlinePaymentForStudent = (studentId: number, invoiceId?: number | null) => {
    const safePayments = Array.isArray(payments) ? payments : [];
    const invId = invoiceId ? Number(invoiceId) : null;
    const rows = safePayments
      .filter((p: any) => {
        const sameStudent = Number(p?.student_id) === Number(studentId);
        const isPending = p?.status === 'Pending';
        const isOnline = p?.payment_method === 'Online Payment';
        const sameInvoice = invId ? Number(p?.invoice_id) === invId : true;
        return sameStudent && isPending && isOnline && sameInvoice;
      })
      .sort((a: any, b: any) => new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime());

    return rows.length > 0 ? rows[0] : null;
  };

  const refreshChildInvoice = async (childId: number) => {
    if (!currentTerm || !currentAcademicYear) return;
    try {
      const summary = await getStudentInvoice(childId, currentTerm, currentAcademicYear);
      setInvoiceSummaries(prev => ({ ...prev, [childId]: summary }));
    } catch (e) {
      // Keep UI stable if invoice not found yet
      setInvoiceSummaries(prev => ({ ...prev, [childId]: null }));
    }
  };

  const refreshAllInvoices = async () => {
    if (!currentTerm || !currentAcademicYear) return;
    if (!children || children.length === 0) return;

    const entries = await Promise.all(
      children.map(async (c) => {
        try {
          const summary = await getStudentInvoice(c.id, currentTerm, currentAcademicYear);
          return [c.id, summary] as const;
        } catch (e) {
          return [c.id, null] as const;
        }
      })
    );

    const next: Record<number, any> = {};
    for (const [id, summary] of entries) {
      next[id] = summary;
    }
    setInvoiceSummaries(next);
  };

  // Refresh invoices when term/year changes (set by admin)
  useEffect(() => {
    if (!currentTerm || !currentAcademicYear) return;
    if (!children || children.length === 0) return;
    refreshAllInvoices();
  }, [currentTerm, currentAcademicYear, children.length]);

  useEffect(() => {
    const refreshParentPayments = async () => {
      if (!currentUser || currentUser.role !== 'parent') return;
      if (!children || children.length === 0) return;
      await loadPaymentsFromAPI();
    };

    refreshParentPayments();
  }, [currentUser?.id, currentUser?.role, children.length]);

  useEffect(() => {
    if (!isPaymentModalOpen || !selectedChild) return;
    const selectedInvoiceId = invoiceSummaries[selectedChild.id]?.invoice?.id;
    const existingPendingOnline = getPendingOnlinePaymentForStudent(Number(selectedChild.id), selectedInvoiceId ?? null);
    if (existingPendingOnline && paymentMethod === 'card') {
      setPaymentMethod('transfer');
    }
  }, [isPaymentModalOpen, selectedChild?.id, payments.length]);

  const getOutstandingForChild = (childId: number) => {
    const inv = invoiceSummaries[childId];
    const outstanding = inv && typeof inv.outstanding === 'number' ? inv.outstanding : 0;
    const credit = inv && typeof inv.credit === 'number' ? inv.credit : 0;
    return { outstanding, credit };
  };

  // WhatsApp Groups State
  const [whatsappGroups, setWhatsappGroups] = useState<any[]>([]);
  const [loadingWhatsappGroups, setLoadingWhatsappGroups] = useState(false);

  const [bankDetails] = useState({
    bank: "Bank details to be provided by school administration",
    accountName: "Please contact school for account information",
    accountNumber: "Available from school administration"
  });

  const currentParent = currentUser && parents.length > 0 ? parents.find((p) => p.id === currentUser?.linked_id) : null;
  
  let parentName = currentUser?.username || "Parent";
  const firstFromUser = (currentUser as any)?.first_name ?? (currentUser as any)?.firstName;
  const lastFromUser = (currentUser as any)?.last_name ?? (currentUser as any)?.lastName;
  if (firstFromUser && lastFromUser) {
    parentName = `${firstFromUser} ${lastFromUser}`;
  } else if (currentParent && currentParent.firstName && currentParent.lastName) {
    parentName = `${currentParent.firstName} ${currentParent.lastName}`;
  }
  
  const unreadCount = currentUser ? getUnreadNotifications().length : 0;

  // Get approved results for linked children
  const getApprovedResultsForChildren = () => {
    if (!children.length || !compiledResults.length) return [];
    
    const approvedResults = compiledResults.filter(result => 
      result.status === 'Approved' && 
      children.some(child => child.id === result.student_id)
    );
    
    return approvedResults;
  };

  const approvedResults = getApprovedResultsForChildren();

  const handleViewResult = (resultId: number) => {
    setActiveItem('children');
    toast.success(`Opening approved result details for ID: ${resultId}`);
  };

  const _handleDownloadResult = (resultId: number) => {
    setActiveItem('children');
    toast.success(`Downloading PDF result for ID: ${resultId}`);
    // In a real implementation, this would generate and download a PDF
  };

  // Profile management functions
  const _handleSaveProfile = async () => {
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
    
    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    try {
      const ok = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (!ok) {
        toast.error("Current password is incorrect");
        return;
      }

      toast.success("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error("Failed to change password");
    }
  };

  const _handleSendMessage = async () => {
    if (!messageData.subject.trim() || !messageData.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      // Determine recipients based on selection
      const recipientRole = messageData.recipient === 'admin' ? 'admin' : 'teacher';
      const recipientUsers = users.filter((u: any) => u.role === recipientRole);
      const targetUserIds = recipientUsers.map((u: any) => Number(u.id)).filter((id: number) => Number.isFinite(id));

      await addNotification({
        title: messageData.subject,
        message: `Message from ${parentName}: ${messageData.message}`,
        type: 'info',
        targetAudience: messageData.recipient === 'admin' ? 'all' : 'teachers',
        sentBy: currentUser?.id || 0,
        sentDate: new Date().toISOString(),
        isRead: false,
        readBy: [],
        targetUsers: targetUserIds,
        deletedBy: []
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

  const _openReceiptDialog = (payment: any) => {
    setSelectedPaymentForReceipt(payment);
    setIsReceiptDialogOpen(true);
  };

  const handleMakePayment = (child: Child) => {
    setSelectedChild(child);
    const inv = invoiceSummaries[child.id];
    const outstanding = inv && typeof inv.outstanding === 'number' ? inv.outstanding : 0;
    setPaymentAmount(outstanding > 0 ? outstanding : 0);

    const selectedInvoiceId = invoiceSummaries[child.id]?.invoice?.id;
    const existingPendingOnline = getPendingOnlinePaymentForStudent(Number(child.id), selectedInvoiceId ?? null);
    setPaymentMethod(existingPendingOnline ? 'transfer' : 'card');

    setIsPaymentModalOpen(true);
  };

  // WhatsApp Groups Functions
  const loadWhatsappGroups = async () => {
    if (!currentUser?.linked_id || children.length === 0) {
      setWhatsappGroups([]);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setWhatsappGroups([]);
      toast.error('Session expired. Please log in again to view WhatsApp groups.');
      return;
    }

    setLoadingWhatsappGroups(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/classes/whatsapp-groups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWhatsappGroups(data.data || []);
      } else if (response.status === 401) {
        setWhatsappGroups([]);
        toast.error('You are not authorized. Please log in again.');
      } else {
        setWhatsappGroups([]);
      }
    } catch (error) {
      setWhatsappGroups([]);
    } finally {
      setLoadingWhatsappGroups(false);
    }
  };

  useEffect(() => {
    if (activeItem !== 'messages') return;
    loadWhatsappGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem, currentUser?.linked_id, children.length]);

  const handleJoinWhatsappGroup = (group: any) => {
    if (!group || !group.whatsapp_group_link) {
      toast.error('WhatsApp group link not available');
      return;
    }

    try {
      // Open WhatsApp group in new tab
      window.open(group.whatsapp_group_link, '_blank');
      toast.success(`Opening ${group.group_name || 'WhatsApp group'}`);
    } catch (error) {
      toast.error('Failed to open WhatsApp group');
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedChild || !paymentAmount || paymentAmount <= 0) {
      toast.error("Please select a student and enter a valid amount");
      return;
    }

    if (paymentMethod === "transfer" && !bankTransferReceipt) {
      toast.error("Please upload a receipt image for bank transfer");
      return;
    }

    setLoadingPayments(true);

    try {
      if (paymentMethod === "transfer") {
        // Handle bank transfer with receipt upload
        toast.loading("Uploading receipt...");
        
        // Upload receipt first
        const formData = new FormData();
        if (bankTransferReceipt) {
          formData.append('file', bankTransferReceipt);
        }
        
        const uploadResponse = await fetch(`${API_CONFIG.BASE_URL}/files/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
          },
          body: formData
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.message || 'Failed to upload receipt');
        }

        const uploadData = await uploadResponse.json();
        const receiptUrl = uploadData.data.url;

        toast.dismiss();
        toast.loading("Submitting payment...");

        // Submit bank transfer proof
        const submitResponse = await fetch(`${API_CONFIG.BASE_URL}/payments/bank-transfer-proof`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
          },
          body: JSON.stringify({
            student_id: selectedChild.id,
            invoice_id: invoiceSummaries[selectedChild.id]?.invoice?.id,
            amount: paymentAmount,
            payment_type: 'School Fees',
            term: currentTerm,
            academic_year: currentAcademicYear,
            proof_url: receiptUrl,
            notes: `Bank transfer by parent for ${selectedChild.fullName}`
          })
        });

        if (!submitResponse.ok) {
          const error = await submitResponse.json();
          throw new Error(error.message || 'Failed to submit payment');
        }

        const submitData = await submitResponse.json();
        
        toast.dismiss();
        toast.success(`Payment submitted! Receipt: ${submitData.data.receipt_number}`);

        // Reset form
        setIsPaymentModalOpen(false);
        setPaymentAmount(0);
        setSelectedChild(null);
        setPaymentMethod("card");
        setBankTransferReceipt(null);
        setLoadingPayments(false);

        await refreshChildInvoice(selectedChild.id);

      } else {
        // Handle online payment (existing logic)
        const selectedInvoiceId = invoiceSummaries[selectedChild.id]?.invoice?.id;
        const existingPendingOnline = payments.find((p: any) => {
          const sameStudent = Number(p?.student_id) === Number(selectedChild.id);
          const isPending = p?.status === 'Pending';
          const isOnline = p?.payment_method === 'Online Payment';
          const sameInvoice = selectedInvoiceId ? Number(p?.invoice_id) === Number(selectedInvoiceId) : true;
          return sameStudent && isPending && isOnline && sameInvoice;
        });

        if (existingPendingOnline) {
          const ref = existingPendingOnline?.transaction_reference || existingPendingOnline?.reference;
          toast.dismiss();
          toast.error(ref ? 'You already have a pending online payment. Please use Check Status instead of paying again.' : 'You already have a pending online payment. Please wait or contact the school to confirm status.');
          setLoadingPayments(false);
          return;
        }

        toast.loading("Initializing payment...");

        const initResponse = await fetch(`${API_CONFIG.BASE_URL}/payments/online-init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
          },
          body: JSON.stringify({
            student_id: selectedChild.id,
            invoice_id: invoiceSummaries[selectedChild.id]?.invoice?.id,
            amount: paymentAmount,
            payment_type: 'School Fees',
            term: currentTerm,
            academic_year: currentAcademicYear,
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
                  'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
              });

              if (!verifyResponse.ok) {
                const error = await verifyResponse.json();
                throw new Error(error.message || 'Payment verification failed');
              }

              const verifyData = await verifyResponse.json();
              
              toast.dismiss();
              toast.success(`Payment successful! Receipt: ${verifyData.data.receipt_number}`);

              await refreshChildInvoice(selectedChild.id);

              setIsPaymentModalOpen(false);
              setPaymentAmount(0);
              setSelectedChild(null);
              setPaymentMethod("card");

              setLoadingPayments(false);

            } catch (verifyError: any) {
              toast.dismiss();
              toast.error('Payment verification failed. Please contact support.');
              setLoadingPayments(false);
            }
          },
          onCancel: () => {
            toast.dismiss();
            toast.info('Payment cancelled. You can try again anytime.');
            setLoadingPayments(false);
          }
        });
      }

    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Payment failed. Please try again.');
      setLoadingPayments(false);
    }
  };

  const handleCheckPaymentStatus = async (reference: string, studentId: number) => {
    try {
      if (!reference) {
        toast.error('Missing transaction reference');
        return;
      }

      toast.loading('Checking payment status...');
      const verifyResponse = await fetch(`${API_CONFIG.BASE_URL}/payments/online-verify?reference=${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });

      const verifyData = await verifyResponse.json();
      toast.dismiss();

      if (verifyResponse.ok && verifyData && verifyData.success) {
        toast.success('Payment status updated');
        await loadPaymentsFromAPI();
        await refreshChildInvoice(studentId);
        return;
      }

      toast.error(verifyData?.message || 'Unable to verify payment right now');
    } catch (e: any) {
      toast.dismiss();
      toast.error(e?.message || 'Unable to check payment status');
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    if (status === 'Verified') {
      return <Badge className="bg-green-100 text-green-700 text-xs">Verified</Badge>;
    }
    if (status === 'Pending') {
      return <Badge className="bg-yellow-100 text-yellow-700 text-xs">Pending</Badge>;
    }
    if (status === 'Rejected') {
      return <Badge className="bg-red-100 text-red-700 text-xs">Rejected</Badge>;
    }
    if (status === 'Reversed') {
      return <Badge className="bg-gray-100 text-gray-700 text-xs">Reversed</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700 text-xs">{status}</Badge>;
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
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      Delete
                    </Button>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
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
              <Button onClick={handleChangePassword} className="w-full">
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

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
                <span className="text-xs font-medium text-white">{currentAcademicYear || "Not Set"}</span>
              </div>
              <div className="bg-blue-700 rounded-lg px-3 py-1.5">
                <span className="text-xs font-medium text-white">{currentTerm || "Not Set"}</span>
              </div>
            </div>
          </div>
          
          {/* Compact Stats Cards */}
          <div className="flex gap-2 lg:flex-col lg:gap-3">
            <div className="bg-blue-700 rounded-xl p-3 lg:p-4 text-center flex-1 lg:flex-none">
              <Users className="w-5 h-5 lg:w-6 lg:h-6 text-white mx-auto mb-2" />
              <div className="text-lg lg:text-xl md:text-2xl font-bold text-white">{children.length}</div>
              <p className="text-white text-xs font-medium">Children</p>
            </div>
            <div className="bg-blue-700 rounded-xl p-3 lg:p-4 text-center flex-1 lg:flex-none">
              <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-white mx-auto mb-2" />
              <div className="text-lg lg:text-xl md:text-2xl font-bold text-white">{unreadCount}</div>
              <p className="text-white text-xs font-medium">Notifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
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
            <div className="text-xl md:text-2xl font-bold text-green-900">{currentTerm || "Not Set"}</div>
            <div className="mt-1 flex items-center text-xs text-green-600">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
              {currentAcademicYear || "Not Set"}
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
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => setActiveItem('messages')}
                >
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
                          <img
                            src={getChildPhotoCandidates(child)[0] || ''}
                            alt={child.fullName}
                            className="w-full h-full object-cover rounded-full"
                            data-candidate-idx={0}
                            onError={(e) => handleChildPhotoError(e, child)}
                          />
                        ) : (
                          <User className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{child.fullName}</p>
                        <p className="text-xs text-gray-500">{child.className}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-600"
                      onClick={() => {
                        setActiveItem('children');
                        toast.success(`Opening ${child.fullName}`);
                      }}
                    >
                      View
                    </Button>
                  </div>
                ))}
                {children.length > 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setActiveItem('children')}
                  >
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
                    <div
                      key={result.id}
                      className="p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                      onClick={() => handleViewResult(result.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{child.fullName}</p>
                          <p className="text-xs text-gray-500">{result.term} • {result.average_score || 'N/A'}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          {result.average_score ? 'View' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {approvedResults.length > 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setActiveItem('children')}
                  >
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
              const invoiceRows = children
                .map(c => invoiceSummaries[c.id])
                .filter(Boolean);

              const totalFees = invoiceRows.reduce((sum: number, inv: any) => sum + Number(inv?.invoice?.invoice_total || 0), 0);
              const totalPaid = invoiceRows.reduce((sum: number, inv: any) => sum + Number(inv?.paid_total || 0), 0);
              const totalOutstanding = invoiceRows.reduce((sum: number, inv: any) => {
                const outstanding = Number(inv?.outstanding || 0);
                return sum + (outstanding > 0 ? outstanding : 0);
              }, 0);
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Total Fees</p>
                      <p className="text-2xl font-bold text-purple-800">{NAIRA}{totalFees.toLocaleString()}</p>
                      <p className="text-xs text-purple-500 mt-1">Academic Year {currentAcademicYear || "2025/2026"}</p>
                    </div>
                    <div className="p-3 rounded-full bg-purple-100">
                      <CreditCard className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-600">Paid</p>
                      <p className="text-2xl font-bold text-green-800">{NAIRA}{totalPaid.toLocaleString()}</p>
                      <p className="text-xs text-green-500 mt-1">Total payments made</p>
                    </div>
                    <div className="p-3 rounded-full bg-green-100">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Outstanding</p>
                      <p className="text-2xl font-bold text-orange-800">{NAIRA}{totalOutstanding.toLocaleString()}</p>
                      <p className="text-xs text-orange-500 mt-1">Due this month</p>
                    </div>
                    <div className="p-3 rounded-full bg-orange-100">
                      <TrendingUp className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setActiveItem('fees')}
                  >
                    View Fee History
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    disabled={loadingPayments}
                    onClick={() => {
                      if (children.length > 0) {
                        handleMakePayment(children[0]);
                      } else {
                        toast.error("No children to make payment for");
                      }
                    }}
                  >
                    {loadingPayments ? (
                      <>
                        <div className="w-3 h-3 border border-gray-800 border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      "Make Payment"
                    )}
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
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

    </div>
  );

  const renderFeesPage = () => {
    try {
      const invRows = children
        .map(c => invoiceSummaries[c.id])
        .filter(Boolean);

      const _totalOutstanding = invRows.reduce((sum: number, inv: any) => {
        const outstanding = Number(inv?.outstanding || 0);
        return sum + (outstanding > 0 ? outstanding : 0);
      }, 0);

      const totalPaid = invRows.reduce((sum: number, inv: any) => sum + Number(inv?.paid_total || 0), 0);
      const currentTermFees = invRows.reduce((sum: number, inv: any) => sum + Number(inv?.invoice?.invoice_total || 0), 0);

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

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-blue-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Fees</p>
                    <p className="text-2xl font-bold text-blue-800">{NAIRA}{currentTermFees.toLocaleString()}</p>
                    <p className="text-xs text-blue-500 mt-1">Academic Year {currentAcademicYear || "2025/2026"}</p>
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
                    <p className="text-2xl font-bold text-green-800">{NAIRA}{totalPaid.toLocaleString()}</p>
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
                    <p className="text-2xl font-bold text-purple-800">{NAIRA}{currentTermFees.toLocaleString()}</p>
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
                      {children.length > 0
                        ? `${children.filter(c => {
                            const inv = invoiceSummaries[c.id];
                            const outstanding = Number(inv?.outstanding || 0);
                            return outstanding <= 0;
                          }).length}/${children.length}`
                        : '0/0'}
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
                        const inv = invoiceSummaries[child.id];
                        const pendingOnline = getPendingOnlinePaymentForStudent(Number(child.id), inv?.invoice?.id ?? null);
                        const pendingRef = pendingOnline?.transaction_reference || pendingOnline?.reference;
                        const paid = Number(inv?.paid_total || 0);
                        const balance = Number(inv?.outstanding || 0);
                        const status =
                          balance <= 0
                            ? "Paid"
                            : paid > 0
                              ? "Partial"
                              : "Unpaid";

                        return (
                          <TableRow key={child.id} className="hover:bg-gray-50">
                            <TableCell className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                  <User className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{child.fullName}</div>
                                  <div className="text-sm text-gray-500">{child.className}</div>
                                  {pendingOnline ? (
                                    <div className="text-xs text-amber-600 mt-1">
                                      Online payment pending — use Check Status or pay via Bank Transfer
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                              {NAIRA}{Number(inv?.invoice?.invoice_total || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                              {NAIRA}{paid.toLocaleString()}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <span className={balance > 0 ? "text-red-600" : "text-green-600"}>
                                {NAIRA}{Math.max(0, balance).toLocaleString()}
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
                                disabled={loadingPayments}
                                onClick={() => handleMakePayment(child)}
                              >
                                {loadingPayments ? (
                                  <>
                                    <div className="w-3 h-3 border border-gray-800 border-t-transparent rounded-full animate-spin mr-1" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="h-4 w-4 mr-1" />
                                    Pay
                                  </>
                                )}
                              </Button>
                              {pendingOnline && pendingRef ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={loadingPayments}
                                  onClick={() => handleCheckPaymentStatus(String(pendingRef), Number(child.id))}
                                  className="mr-2"
                                >
                                  Check Status
                                </Button>
                              ) : null}
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
                      <TableHead className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</TableHead>
                      <TableHead className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parentPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-6 text-center text-sm text-gray-500">
                          No payment history found yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      parentPayments.map((payment: any) => {
                        const child = children.find((c) => c.id === payment.student_id);
                        const ref = payment.transaction_reference || payment.reference;
                        const canCheckStatus = payment.status === 'Pending' && payment.payment_method === 'Online Payment' && !!ref;
                        return (
                          <TableRow key={payment.id}>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(payment.recorded_date).toLocaleDateString('en-GB')}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {child?.fullName || payment.student_name || 'Student'}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {payment.payment_type}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                              {NAIRA}{Number(payment.amount || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              {getPaymentStatusBadge(payment.status)}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 font-mono">
                              {payment.receipt_number || '-'}</TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              {canCheckStatus ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={loadingPayments}
                                  onClick={() => handleCheckPaymentStatus(String(ref), Number(payment.student_id))}
                                >
                                  Check Status
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
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

          <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogContent className="max-w-[95vw] sm:max-w-[600px] mx-4 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Make Payment
                </DialogTitle>
                <DialogDescription>Complete your payment using the available payment methods.</DialogDescription>
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
                        <p className="text-sm text-gray-500">{selectedChild.className}</p>
                        <p className="text-xs text-gray-400">Outstanding: {NAIRA}{Math.max(0, invoiceSummaries[selectedChild.id]?.outstanding || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedChild && (() => {
                  const selectedInvoiceId = invoiceSummaries[selectedChild.id]?.invoice?.id;
                  const pendingOnline = getPendingOnlinePaymentForStudent(Number(selectedChild.id), selectedInvoiceId ?? null);
                  if (!pendingOnline) return null;
                  const ref = pendingOnline.transaction_reference || pendingOnline.reference;
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-yellow-900">Pending online payment detected</p>
                          <p className="text-xs text-yellow-800 mt-1">To prevent double payment, online payment is disabled until status is confirmed.</p>
                        </div>
                        {ref ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={loadingPayments}
                            onClick={() => handleCheckPaymentStatus(String(ref), Number(selectedChild.id))}
                          >
                            Check Status
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}
                
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium">Payment Amount ({NAIRA})</Label>
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
                      Remaining balance after payment: {NAIRA}{Math.max(0, getOutstandingForChild(selectedChild.id).outstanding - paymentAmount).toLocaleString()}
                    </p>
                  )}
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Payment Method</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      variant={paymentMethod === "card" ? "default" : "outline"}
                      onClick={() => setPaymentMethod("card")}
                      disabled={(() => {
                        if (!selectedChild) return false;
                        const selectedInvoiceId = invoiceSummaries[selectedChild.id]?.invoice?.id;
                        return !!getPendingOnlinePaymentForStudent(Number(selectedChild.id), selectedInvoiceId ?? null);
                      })()}
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-blue-900 mb-2">Bank Transfer Details</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p><strong>Bank:</strong> {bankDetails.bank}</p>
                      <p><strong>Account Name:</strong> {bankDetails.accountName}</p>
                      <p><strong>Account Number:</strong> {bankDetails.accountNumber}</p>
                      <p className="text-xs mt-2">Please upload receipt after payment</p>
                    </div>
                    <div className="flex flex-col gap-2 mt-3">
                      <Label htmlFor="receipt-upload" className="text-sm font-medium">Upload Receipt Image</Label>
                      <Input
                        id="receipt-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setBankTransferReceipt(e.target.files[0]);
                          }
                        }}
                        className="text-sm"
                      />
                      {bankTransferReceipt && (
                        <div className="text-xs text-gray-600">
                          Selected: {bankTransferReceipt.name}
                        </div>
                      )}
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
                  disabled={!selectedChild || !paymentAmount || paymentAmount <= 0 || (paymentMethod === "transfer" && !bankTransferReceipt)}
                  className="w-full sm:w-auto"
                >
                  {paymentMethod === "card" ? (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay {NAIRA}{paymentAmount ? paymentAmount.toLocaleString() : "0"}
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
      //console.error("Error rendering fees page:", error);
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

  const renderMessagesPage = () => {
    // Get unique classes from children
    const uniqueClasses = children
      .map((child: any) => {
        const rawClassId: unknown = child.class_id ?? child.classId;
        const classId: number | undefined =
          typeof rawClassId === 'number'
            ? rawClassId
            : typeof rawClassId === 'string'
              ? parseInt(rawClassId, 10)
              : undefined;
        const classNameFromChild: string | undefined = child.className ?? child.class_name;
        const classNameFromClasses: string | undefined =
          typeof classId === 'number'
            ? (classes as any[])?.find((c: any) => (c.id ?? c.classId) === classId)?.name
            : undefined;

        const className = (classNameFromChild || classNameFromClasses || '').trim();

        return {
          id: classId,
          name: className
        };
      })
      .filter((cls): cls is { id: number; name: string } => typeof cls.id === 'number' && !Number.isNaN(cls.id) && Boolean(cls.name))
      .reduce((acc: { id: number; name: string }[], current) => {
        // Remove duplicates by id
        if (!acc.some(item => item.id === current.id)) {
          acc.push(current);
        }
        return acc;
      }, []);

    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-[#1F2937] mb-2">Messages & Groups</h1>
          <p className="text-[#6B7280]">Communicate with school administration and join class groups</p>
        </div>

        {/* WhatsApp Class Groups Section */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Class WhatsApp Groups</h3>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loadingWhatsappGroups ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading WhatsApp groups...</p>
              </div>
            ) : children.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h3>
                <p className="text-gray-600">No linked students found. WhatsApp groups will appear here once your children are linked to classes.</p>
              </div>
            ) : uniqueClasses.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h3>
                <p className="text-gray-600">Your students are linked, but their classes could not be resolved. Please contact the school administration.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uniqueClasses.map((classInfo) => {
                  const whatsappGroup = whatsappGroups.find((g: any) => (g.class_id ?? g.classId) === classInfo.id);

                  return (
                    <Card key={classInfo.id} className="border border-gray-200 hover:border-green-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{classInfo.name}</h4>
                            <p className="text-sm text-gray-600">
                              {whatsappGroup ? (whatsappGroup.group_name || 'Parents Group') : 'Group not configured'}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleJoinWhatsappGroup(whatsappGroup)}
                            disabled={!whatsappGroup || !whatsappGroup.whatsapp_group_link}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                            size="sm"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            {whatsappGroup && whatsappGroup.whatsapp_group_link ? 'Join Group' : 'Not Available'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const sidebarSections = [
    { label: 'Overview', ids: ['dashboard'] },
    { label: 'Family', ids: ['children'] },
    { label: 'Finance', ids: ['fees'] },
    { label: 'Communication', ids: ['notifications', 'messages'] },
    { label: 'Account', ids: ['settings'] },
  ];

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: "children", label: "My Children", icon: <BookOpen className="h-5 w-5" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-5 w-5" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
    { id: "fees", label: "Fee Management", icon: <CreditCard className="h-5 w-5" /> },
    { id: "messages", label: "Messages", icon: <Mail className="h-5 w-5" /> },
  ];

  const handleItemClick = (id: string) => {
    // Only show toast for important actions, not navigation
    if (id === 'fees') {
      toast.success("Opening Fee Management");
    }
    setActiveItem(id);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardSidebar
        items={sidebarItems}
        activeItem={activeItem}
        onItemClick={handleItemClick}
        sections={sidebarSections}
        schoolName={schoolSettings.school_name || currentUser?.school_name || 'School'}
      />

      <div className="lg:pl-[var(--sidebar-width,256px)]">
        <DashboardTopBar
          userName={parentName}
          userRole="parent"
          notificationCount={unreadCount}
          onNotificationClick={() => {}}
          onLogout={onLogout}
          schoolName={schoolSettings.school_name || currentUser?.school_name || 'School'}
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

      {/* Receipt Dialog */}
      <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937] flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Payment Receipt
            </DialogTitle>
            <DialogDescription>View and print the payment receipt details.</DialogDescription>
          </DialogHeader>

          {selectedPaymentForReceipt && (
            <PaymentReceipt 
              payment={selectedPaymentForReceipt} 
              studentName={selectedPaymentForReceipt.student_name}
              studentClassName={selectedPaymentForReceipt.class_name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



