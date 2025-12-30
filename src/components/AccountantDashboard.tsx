import { LogOut, BarChart, Building, LayoutDashboard, BarChart3, Building2, DollarSign, Receipt, FileText, Clock, MessageSquare, Settings } from 'lucide-react';
import { useState, useEffect } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { RecordPaymentPage } from "./accountant/RecordPaymentPage";
import { PaymentHistoryPage } from "./accountant/PaymentHistoryPage";
import { VerifyReceiptsPage } from "./accountant/VerifyReceiptsPage";
import { SetFeesPage } from "./accountant/SetFeesPage";
import { PaymentReportsPage } from "./accountant/PaymentReportsPage";
import { BankAccountSettingsPage } from "./accountant/BankAccountSettingsPage";
import { ManualPaymentEntryPage } from "./admin/ManualPaymentEntryPage";
import { ChangePasswordPage } from "./ChangePasswordPage";
import { AccountantMessagePage } from "./accountant/MessageParentsPage";
import { ViewNotificationsPage } from "./shared/ViewNotificationsPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useSchool } from "../contexts/SchoolContext";
import { connectionMonitor } from "../utils/connectionMonitor";
import { toast } from "sonner";

interface AccountantDashboardProps {
  onLogout: () => void;
}

export function AccountantDashboard({ onLogout }: AccountantDashboardProps) {
  const { 
    payments, 
    currentUser, 
    accountants, 
    studentFeeBalances, 
    students,
    classes,
    currentTerm,
    currentAcademicYear,
    getUnreadNotifications
  } = useSchool();
  const [activeItem, setActiveItem] = useState("dashboard");

  // Connection monitoring for accountants
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

  // Get current accountant
  const currentAccountant = currentUser && accountants.length > 0 ? accountants.find(a => a.id === currentUser.linked_id) : null;
  const accountantName = currentAccountant ? `${currentAccountant.firstName || ''} ${currentAccountant.lastName || ''}`.trim() : 'Accountant';

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", id: "dashboard" },
    { icon: <DollarSign className="w-5 h-5" />, label: "Set Fees", id: "set-fees" },
    { icon: <Receipt className="w-5 h-5" />, label: "Record Payments", id: "record-payments" },
    { icon: <FileText className="w-5 h-5" />, label: "Manual Payment Entry", id: "manual-payment-entry" },
    { icon: <Clock className="w-5 h-5" />, label: "Verify Receipts", id: "verify-receipts" },
    { icon: <BarChart3 className="w-5 h-5" />, label: "Payment Reports", id: "payment-reports" },
    { icon: <BarChart className="w-5 h-5" />, label: "Payment History", id: "payment-history" },
    { icon: <Building2 className="w-5 h-5" />, label: "Bank Settings", id: "bank-settings" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "Message Parents", id: "message-parents" },
    { icon: <Settings className="w-5 h-5" />, label: "Change Password", id: "change-password" },
    { icon: <LogOut className="w-5 h-5" />, label: "Logout", id: "logout" },
  ];

  const handleItemClick = (id: string) => {
    if (id === "logout") {
      toast.success("Logged out successfully");
      onLogout();
    } else {
      // Add toast messages for navigation
      const toastMessages: Record<string, string> = {
        "dashboard": "Opening Dashboard",
        "set-fees": "Opening Fee Settings",
        "record-payments": "Opening Payment Recording",
        "manual-payment-entry": "Opening Manual Payment Entry",
        "verify-receipts": "Opening Receipt Verification",
        "payment-reports": "Opening Payment Reports",
        "payment-history": "Opening Payment History",
        "bank-settings": "Opening Bank Settings",
        "message-parents": "Opening Parent Messaging",
        "change-password": "Opening Password Change"
      };
      
      if (toastMessages[id]) {
        toast.success(toastMessages[id]);
      }
      setActiveItem(id);
    }
  };

  const pendingPayments = payments.filter(p => p.status === 'Pending');
  const unreadNotifications = currentUser ? getUnreadNotifications() : [];

  // Calculate real statistics
  const academicYearFromBalances = studentFeeBalances.length > 0 ? studentFeeBalances[0].academic_year : currentAcademicYear;

  const totalFeeRequired = studentFeeBalances.reduce((sum, balance) => sum + balance.total_fee_required, 0);
  const totalPaid = studentFeeBalances.reduce((sum, balance) => sum + balance.total_paid, 0);
  const totalOutstanding = studentFeeBalances.reduce((sum, b) => sum + b.balance, 0);
  const collectionRate = totalFeeRequired > 0 ? ((totalPaid / totalFeeRequired) * 100).toFixed(1) : "0";

  // Today's payments
  const today = new Date().toDateString();
  const recentPayments = payments.slice(0, 5).sort((a, b) => new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime());
  const todayPayments = payments.filter(p => {
    const paymentDate = new Date(p.recorded_date).toDateString();
    return paymentDate === today && p.status === 'Verified';
  });

  const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  // Notification dialog state
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <DashboardSidebar
        items={sidebarItems}
        activeItem={activeItem}
        onItemClick={handleItemClick}
        themeColor="#007C91"
      />

      <div className="lg:pl-64">
        <DashboardTopBar
          userName={accountantName}
          userRole="Accountant"
          notificationCount={unreadNotifications.length}
          onLogout={onLogout}
          onNotificationClick={() => setNotificationDialogOpen(true)}
        />

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {activeItem === "dashboard" ? (
            <div className="space-y-6">
              <div className="mb-6">
                <h1 className="text-[#1F2937] mb-2">Welcome, {accountantName}</h1>
                <p className="text-[#6B7280]">Financial Management & Fee Collection</p>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-xl bg-gradient-to-br from-[#007C91] to-[#006073] text-white border-0 shadow-clinical hover:shadow-clinical-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="w-6 h-6" />
                      </div>
                      <span className="text-sm opacity-80">{collectionRate}%</span>
                    </div>
                    <p className="text-white/80 text-sm mb-1">Total Collected</p>
                    <h3 className="text-white">₦{totalPaid.toLocaleString()}</h3>
                    <p className="text-xs text-white/60 mt-2">{currentTerm}</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white border-0 shadow-clinical hover:shadow-clinical-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="w-6 h-6" />
                      </div>
                      <span className="text-sm opacity-80">Today</span>
                    </div>
                    <p className="text-white/80 text-sm mb-1">Today's Revenue</p>
                    <h3 className="text-white">₦{todayRevenue.toLocaleString()}</h3>
                    <p className="text-xs text-white/60 mt-2">{todayPayments.length} payments</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#F4B400] text-white border-0 shadow-clinical hover:shadow-clinical-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="w-6 h-6" />
                      </div>
                      <Badge className="bg-white/20 text-white border-0">{pendingPayments.length}</Badge>
                    </div>
                    <p className="text-white/80 text-sm mb-1">Pending Verification</p>
                    <h3 className="text-white">{pendingPayments.length}</h3>
                    <p className="text-xs text-white/60 mt-2">Awaiting approval</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-gradient-to-br from-[#EF4444] to-[#DC2626] text-white border-0 shadow-clinical hover:shadow-clinical-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-white/80 text-sm mb-1">Outstanding</p>
                    <h3 className="text-white">₦{totalOutstanding.toLocaleString()}</h3>
                    <p className="text-xs text-white/60 mt-2">Requires follow-up</p>
                  </CardContent>
                </Card>
              </div>

              {/* Collection Progress */}
              <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
                <CardHeader className="p-6 border-b border-[#E5E7EB]">
                  <CardTitle className="text-[#1F2937]">Fee Collection Progress - {currentTerm}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#6B7280] text-sm">Collection Rate</span>
                      <span className="text-[#007C91]">{collectionRate}%</span>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#007C91] to-[#10B981] h-full rounded-full transition-all duration-500"
                        style={{ width: `${collectionRate}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="p-4 bg-[#F9FAFB] rounded-lg">
                        <p className="text-xs text-[#6B7280] mb-1">Expected</p>
                        <p className="text-[#1F2937]">₦{totalFeeRequired.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-[#10B981]/10 rounded-lg">
                        <p className="text-xs text-[#6B7280] mb-1">Collected</p>
                        <p className="text-[#10B981]">₦{totalPaid.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-[#EF4444]/10 rounded-lg">
                        <p className="text-xs text-[#6B7280] mb-1">Outstanding</p>
                        <p className="text-[#EF4444]">₦{totalOutstanding.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Payment Verifications */}
              <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
                <CardHeader className="p-6 border-b border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#1F2937]">Pending Payment Verifications</CardTitle>
                    <Badge className="bg-[#F59E0B] text-white border-0 rounded-full">{pendingPayments.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#007C91] border-none hover:bg-[#007C91]">
                          <TableHead className="text-white">Student Name</TableHead>
                          <TableHead className="text-white">Term</TableHead>
                          <TableHead className="text-white">Amount</TableHead>
                          <TableHead className="text-white">Date</TableHead>
                          <TableHead className="text-white">Payment Method</TableHead>
                          <TableHead className="text-white text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingPayments.length === 0 ? (
                          <TableRow className="bg-white">
                            <TableCell colSpan={6} className="text-center py-8 text-[#6B7280]">
                              No pending payments to verify
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendingPayments.slice(0, 5).map((payment) => (
                            <TableRow key={payment.id} className="bg-white border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                              <TableCell className="text-[#1F2937]">{payment.student_name}</TableCell>
                              <TableCell className="text-[#6B7280]">{payment.term}</TableCell>
                              <TableCell className="text-[#007C91]">₦{payment.amount.toLocaleString()}</TableCell>
                              <TableCell className="text-[#6B7280]">{new Date(payment.recorded_date).toLocaleDateString()}</TableCell>
                              <TableCell className="text-[#6B7280]">{payment.payment_method}</TableCell>
                              <TableCell className="text-center">
                                <Button 
                                  onClick={() => {
                                    toast.success("Opening receipt verification");
                                    setActiveItem('verify-receipts');
                                  }}
                                  className="bg-[#007C91] hover:bg-[#006073] text-white rounded-xl text-xs h-9 shadow-clinical hover:shadow-clinical-lg transition-all"
                                >
                                  <span className="w-3 h-3 mr-1" />
                                  Verify
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {pendingPayments.length > 5 && (
                    <div className="p-4 border-t border-[#E5E7EB] text-center">
                      <Button
                        onClick={() => setActiveItem('verify-receipts')}
                        variant="outline"
                        className="text-[#007C91] border-[#007C91] hover:bg-[#007C91]/10 rounded-xl"
                      >
                        View All {pendingPayments.length} Pending Payments
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
                            {/* Recent Verified Payments */}
              <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
                <CardHeader className="p-6 border-b border-[#E5E7EB]">
                  <CardTitle className="text-[#1F2937]">Recent Verified Payments</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {payments.filter(p => p.status === 'Verified').slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border-b border-[#E5E7EB] last:border-0">
                      <div>
                        <p className="font-medium text-[#1F2937]">{payment.student_name}</p>
                        <p className="text-sm text-[#6B7280]">{payment.payment_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#007C91]">${payment.amount}</p>
                        <p className="text-xs text-[#6B7280]">{new Date(payment.recorded_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card 
                className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all cursor-pointer group"
                onClick={() => {
                  toast.success("Opening fee structure settings");
                  setActiveItem('set-fees');
                }}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#007C91]/10 flex items-center justify-center group-hover:bg-[#007C91]/20 transition-all">
                    <span className="w-8 h-8 text-[#007C91]" />
                  </div>
                  <h3 className="text-[#1F2937] mb-2">Set Fee Structure</h3>
                  <p className="text-sm text-[#6B7280]">Configure fees for classes</p>
                </CardContent>
              </Card>

              <Card 
                className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all cursor-pointer group"
                onClick={() => {
                  toast.success("Opening payment recording");
                  setActiveItem('record-payments');
                }}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#10B981]/10 flex items-center justify-center group-hover:bg-[#10B981]/20 transition-all">
                    <span className="w-8 h-8 text-[#10B981]" />
                  </div>
                  <h3 className="text-[#1F2937] mb-2">Record Payment</h3>
                  <p className="text-sm text-[#6B7280]">Record payments</p>
                </CardContent>
              </Card>

              <Card 
                className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all cursor-pointer group"
                onClick={() => {
                  toast.success("Opening payment reports");
                  setActiveItem('payment-reports');
                }}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F4B400]/10 flex items-center justify-center group-hover:bg-[#F4B400]/20 transition-all">
                    <BarChart3 className="w-8 h-8 text-[#F4B400]" />
                  </div>
                  <h3 className="text-[#1F2937] mb-2">Payment Reports</h3>
                  <p className="text-sm text-[#6B7280]">View payment reports</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
        </main>
        
        {activeItem !== "dashboard" && (
          <main className="p-4 md:p-6 max-w-7xl mx-auto">
            {activeItem === "set-fees" && <SetFeesPage />}
            {activeItem === "record-payments" && <RecordPaymentPage />}
            {activeItem === "manual-payment-entry" && <ManualPaymentEntryPage />}
            {activeItem === "payment-reports" && <PaymentReportsPage />}
            {activeItem === "payment-history" && <PaymentHistoryPage />}
            {activeItem === "bank-settings" && <BankAccountSettingsPage />}
            {activeItem === "message-parents" && <AccountantMessagePage />}
            {activeItem === "change-password" && <ChangePasswordPage />}
            {activeItem === "verify-receipts" && <VerifyReceiptsPage />}
          </main>
        )}
      </div>

      {/* Notification Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <ViewNotificationsPage />
        </DialogContent>
      </Dialog>
    </div>
  );
}

