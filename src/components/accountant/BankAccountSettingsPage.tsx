import { Building, Building2 } from 'lucide-react';
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Alert, AlertDescription } from "../ui/alert";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";

export function BankAccountSettingsPage() {
  const { bankAccountSettings, updateBankAccountSettings, currentUser } = useSchool();

  const [formData, setFormData] = useState<{
    bank_name: string;
    account_name: string;
    account_number: string;
    payment_methods: {
      bank_transfer: boolean;
      online_payment: boolean;
      cash: boolean;
    };
  }>({
    bank_name: "",
    account_name: "",
    account_number: "",
    payment_methods: {
      bank_transfer: true,
      online_payment: false,
      cash: true,
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (bankAccountSettings) {
      setFormData({
        bank_name: bankAccountSettings.bank_name,
        account_name: bankAccountSettings.account_name,
        account_number: bankAccountSettings.account_number,
        payment_methods: bankAccountSettings.payment_methods,
      });
    }
  }, [bankAccountSettings]);

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    setFormData({
      ...formData,
      payment_methods: {
        ...formData.payment_methods,
        [method]: checked,
      },
    });
  };

  const handleSave = async () => {
    if (!formData.bank_name || !formData.account_name || !formData.account_number) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!currentUser) {
      toast.error("User not authenticated");
      return;
    }

    setIsLoading(true);
    try {
      await updateBankAccountSettings({
        bank_name: formData.bank_name,
        account_name: formData.account_name,
        account_number: formData.account_number,
        payment_methods: formData.payment_methods,
        updated_by: currentUser.id,
      });

      toast.success("Bank account settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save bank account settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Bank Account Settings</h1>
        <p className="text-[#6B7280]">Manage school bank account and payment methods</p>
      </div>

      <Alert className="bg-[#007C91]/10 border-[#007C91] rounded-xl">
        <span className="h-4 w-4 text-[#007C91]" />
        <AlertDescription className="text-[#007C91]">
          This information will be displayed to parents for fee payments. Ensure all details are accurate.
        </AlertDescription>
      </Alert>

      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#007C91]/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#007C91]" />
            </div>
            <div>
              <CardTitle className="text-[#1F2937]">Bank Account Information</CardTitle>
              <p className="text-sm text-[#6B7280] mt-1">Configure school bank account details</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <Label className="text-[#1F2937] mb-2 block">Bank Name *</Label>
              <Input
                type="text"
                value={formData.bank_name}
                onChange={(e) => handleInputChange("bank_name", e.target.value)}
                placeholder="e.g., First Bank of Nigeria"
                className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]"
              />
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Account Name *</Label>
              <Input
                type="text"
                value={formData.account_name}
                onChange={(e) => handleInputChange("account_name", e.target.value)}
                placeholder="e.g., Graceland Royal Academy Gombe"
                className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]"
              />
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Account Number *</Label>
              <Input
                type="text"
                value={formData.account_number}
                onChange={(e) => handleInputChange("account_number", e.target.value)}
                placeholder="e.g., 1234567890"
                maxLength={10}
                className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#F4B400]/10 flex items-center justify-center">
              <span className="w-6 h-6 text-[#F4B400]" />
            </div>
            <div>
              <CardTitle className="text-[#1F2937]">Payment Methods</CardTitle>
              <p className="text-sm text-[#6B7280] mt-1">Select available payment options for parents</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] hover:border-[#007C91] transition-all">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="bankTransfer"
                  checked={formData.payment_methods.bank_transfer}
                  onCheckedChange={(checked: boolean) => handlePaymentMethodChange("bank_transfer", checked)}
                />
                <Label htmlFor="bankTransfer" className="text-[#1F2937] cursor-pointer">
                  Bank Transfer
                </Label>
              </div>
              <span className="text-sm text-[#6B7280]">Direct transfer to school account</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] hover:border-[#007C91] transition-all">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="onlinePayment"
                  checked={formData.payment_methods.online_payment}
                  onCheckedChange={(checked: boolean) => handlePaymentMethodChange("online_payment", checked)}
                />
                <Label htmlFor="onlinePayment" className="text-[#1F2937] cursor-pointer">
                  Online Payment Gateway
                </Label>
              </div>
              <span className="text-sm text-[#6B7280]">Paystack, Flutterwave, etc.</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] hover:border-[#007C91] transition-all">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="cash"
                  checked={formData.payment_methods.cash}
                  onCheckedChange={(checked: boolean) => handlePaymentMethodChange("cash", checked)}
                />
                <Label htmlFor="cash" className="text-[#1F2937] cursor-pointer">
                  Cash Payment
                </Label>
              </div>
              <span className="text-sm text-[#6B7280]">Payment at school office</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {bankAccountSettings && (
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="p-6 border-b border-[#E5E7EB]">
            <CardTitle className="text-[#1F2937]">Current Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F9FAFB] rounded-lg">
                <p className="text-sm text-[#6B7280] mb-1">Bank Name</p>
                <p className="text-[#1F2937]">{bankAccountSettings.bank_name}</p>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg">
                <p className="text-sm text-[#6B7280] mb-1">Account Number</p>
                <p className="text-[#1F2937]">{bankAccountSettings.account_number}</p>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg md:col-span-2">
                <p className="text-sm text-[#6B7280] mb-1">Account Name</p>
                <p className="text-[#1F2937]">{bankAccountSettings.account_name}</p>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg md:col-span-2">
                <p className="text-sm text-[#6B7280] mb-2">Active Payment Methods</p>
                <div className="flex gap-2">
                  {bankAccountSettings.payment_methods?.bank_transfer && (
                    <span className="px-3 py-1 bg-[#007C91] text-white text-sm rounded-full">Bank Transfer</span>
                  )}
                  {bankAccountSettings.payment_methods?.online_payment && (
                    <span className="px-3 py-1 bg-[#007C91] text-white text-sm rounded-full">Online Payment</span>
                  )}
                  {bankAccountSettings.payment_methods?.cash && (
                    <span className="px-3 py-1 bg-[#007C91] text-white text-sm rounded-full">Cash</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="bg-[#007C91] hover:bg-[#006073] text-white rounded-xl shadow-clinical hover:shadow-clinical-lg transition-all"
        >
          <span className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
