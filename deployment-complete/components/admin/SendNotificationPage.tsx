import { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { useSchool } from '../../contexts/SchoolContext';

export function SendNotificationPage() {
  const { addNotification, currentUser, teachers, parents, students, accountants } = useSchool();
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: '' as 'info' | 'warning' | 'success' | 'error' | '',
    targetAudience: '' as 'all' | 'teachers' | 'parents' | 'students' | 'accountants' | '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    if (!formData.type) newErrors.type = 'Notification type is required';
    if (!formData.targetAudience) newErrors.targetAudience = 'Target audience is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getRecipientCount = () => {
    switch (formData.targetAudience) {
      case 'teachers':
        return teachers.filter(t => t.status === 'Active').length;
      case 'parents':
        return parents.filter(p => p.status === 'Active').length;
      case 'students':
        return students.filter(s => s.status === 'Active').length;
      case 'accountants':
        return accountants.filter(a => a.status === 'Active').length;
      case 'all':
        return (
          teachers.filter(t => t.status === 'Active').length +
          parents.filter(p => p.status === 'Active').length +
          accountants.filter(a => a.status === 'Active').length
        );
      default:
        return 0;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!currentUser) {
      toast.error('You must be logged in to send notifications');
      return;
    }

    try {
      addNotification({
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        targetAudience: formData.targetAudience,
        sentBy: currentUser.id,
      });

      toast.success(
        `Notification sent to ${getRecipientCount()} recipient(s) successfully!`
      );

      // Reset form
      setFormData({
        title: '',
        message: '',
        type: '',
        targetAudience: '',
      });
      setErrors({});
    } catch (error) {
      toast.error('Failed to send notification. Please try again.');
      }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      message: '',
      type: '',
      targetAudience: '',
    });
    setErrors({});
  };

  const typeColors = {
    info: 'bg-[#3B82F6] text-white',
    success: 'bg-[#10B981] text-white',
    warning: 'bg-[#F59E0B] text-white',
    error: 'bg-[#EF4444] text-white',
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 mb-2">Send Notification</h1>
        <p className="text-gray-600">
          Send announcements and notifications to users
        </p>
      </div>

      <Alert className="bg-blue-50 border-blue-200 rounded-xl">
        <span className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-gray-900">
          <strong>Notification System:</strong>
          <br />
          • Send real-time notifications to teachers, parents, accountants, or all users
          <br />
          • Choose notification type for appropriate visual indicators
          <br />
          • Recipients will see notifications immediately in their dashboards
          <br />
          • All notifications are tracked and can be viewed in the archives
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit}>
        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardHeader className="p-5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 text-[#2563EB]" />
              <h3 className="text-lg text-gray-900">Notification Details</h3>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-gray-700">
                Notification Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Enter notification title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`h-12 rounded-xl border ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                } bg-white text-gray-900`}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label className="text-gray-700">
                Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Enter notification message..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={5}
                className={`rounded-xl border ${
                  errors.message ? 'border-red-500' : 'border-gray-300'
                } bg-white text-gray-900`}
              />
              {errors.message && <p className="text-xs text-red-500">{errors.message}</p>}
              <p className="text-xs text-gray-500">
                {formData.message.length} characters
              </p>
            </div>

            {/* Type and Target Audience */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">
                  Notification Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'info' | 'warning' | 'success' | 'error') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger
                    className={`h-12 rounded-xl border ${
                      errors.type ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="info" className="text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                        Information
                      </div>
                    </SelectItem>
                    <SelectItem value="success" className="text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                        Success
                      </div>
                    </SelectItem>
                    <SelectItem value="warning" className="text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                        Warning
                      </div>
                    </SelectItem>
                    <SelectItem value="error" className="text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                        Error/Alert
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">
                  Target Audience <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(
                    value: 'all' | 'teachers' | 'parents' | 'students' | 'accountants'
                  ) => setFormData({ ...formData, targetAudience: value })}
                >
                  <SelectTrigger
                    className={`h-12 rounded-xl border ${
                      errors.targetAudience ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                  >
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="all" className="text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4" />
                        All Users
                      </div>
                    </SelectItem>
                    <SelectItem value="teachers" className="text-gray-900">
                      Teachers Only ({teachers.filter(t => t.status === 'Active').length})
                    </SelectItem>
                    <SelectItem value="parents" className="text-gray-900">
                      Parents Only ({parents.filter(p => p.status === 'Active').length})
                    </SelectItem>
                    <SelectItem value="accountants" className="text-gray-900">
                      Accountants Only ({accountants.filter(a => a.status === 'Active').length})
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.targetAudience && (
                  <p className="text-xs text-red-500">{errors.targetAudience}</p>
                )}
              </div>
            </div>

            {/* Preview */}
            {formData.title && formData.message && formData.type && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-700 mb-3">
                  <strong>Preview:</strong>
                </p>
                <div
                  className={`p-4 rounded-lg ${
                    typeColors[formData.type as keyof typeof typeColors]
                  }`}
                >
                  <p className="font-medium mb-1">{formData.title}</p>
                  <p className="text-sm opacity-90">{formData.message}</p>
                </div>
                {formData.targetAudience && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-4 h-4" />
                    <span>
                      Will be sent to{' '}
                      <strong className="text-gray-900">{getRecipientCount()}</strong>{' '}
                      recipient(s)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={handleReset}
                variant="outline"
                className="flex-1 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Reset
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl shadow-sm"
              >
                <span className="w-4 h-4 mr-2" />
                Send Notification
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Teachers</p>
              <span className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <p className="text-2xl text-gray-900">
              {teachers.filter(t => t.status === 'Active').length}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Parents</p>
              <span className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-2xl text-gray-900">
              {parents.filter(p => p.status === 'Active').length}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Accountants</p>
              <span className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <p className="text-2xl text-gray-900">
              {accountants.filter(a => a.status === 'Active').length}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Users</p>
              <span className="w-5 h-5 text-[#EF4444]" />
            </div>
            <p className="text-2xl text-gray-900">
              {teachers.filter(t => t.status === 'Active').length +
                parents.filter(p => p.status === 'Active').length +
                accountants.filter(a => a.status === 'Active').length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
