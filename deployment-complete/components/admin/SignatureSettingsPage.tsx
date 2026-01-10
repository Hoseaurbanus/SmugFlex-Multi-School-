import { School } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSchool } from '@/contexts/SchoolContext';
import { API_CONFIG } from '@/config/api';
import { toast } from 'sonner';

interface SignatureSettings {
  id?: number;
  academic_year: string;
  term: string;
  principal_name: string;
  principal_signature: string | null;
  principal_comment: string;
  head_teacher_name: string;
  head_teacher_signature: string | null;
  head_teacher_comment: string;
  resumption_date: string;
  created_at?: string;
  updated_at?: string;
}

export function SignatureSettingsPage() {
  const { currentUser } = useSchool();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signatureSettings, setSignatureSettings] = useState<SignatureSettings>({
    academic_year: '2024/2025',
    term: 'Third Term',
    principal_name: 'OROGUN GLORY EJIRO',
    principal_signature: null,
    principal_comment: 'A very good result. Release your potentials cause you can do more dear.',
    head_teacher_name: 'MRS. ABDULHAMID BINTA',
    head_teacher_signature: null,
    head_teacher_comment: 'A very good result. Keep up the excellent work!',
    resumption_date: '2025-09-15'
  });

  const [principalSignatureFile, setPrincipalSignatureFile] = useState<File | null>(null);
  const [headTeacherSignatureFile, setHeadTeacherSignatureFile] = useState<File | null>(null);
  const [principalSignaturePreview, setPrincipalSignaturePreview] = useState<string>('');
  const [headTeacherSignaturePreview, setHeadTeacherSignaturePreview] = useState<string>('');

  useEffect(() => {
    loadSignatureSettings();
  }, []);

  const loadSignatureSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/database/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
        body: JSON.stringify({
          query: `
            SELECT * FROM signature_settings 
            WHERE academic_year = ? AND term = ? 
            ORDER BY created_at DESC 
            LIMIT 1
          `,
          params: [signatureSettings.academic_year, signatureSettings.term]
        })
      });

      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        const settings = result.data[0];
        setSignatureSettings(settings);
        
        if (settings.principal_signature) {
          setPrincipalSignaturePreview(settings.principal_signature);
        }
        if (settings.head_teacher_signature) {
          setHeadTeacherSignaturePreview(settings.head_teacher_signature);
        }
      }
    } catch (error) {
      console.error('Error loading signature settings:', error);
      toast.error('Failed to load signature settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'principal' | 'head_teacher') => {
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      if (type === 'principal') {
        setPrincipalSignaturePreview(dataUrl);
        setPrincipalSignatureFile(file);
        setSignatureSettings(prev => ({ ...prev, principal_signature: dataUrl }));
      } else {
        setHeadTeacherSignaturePreview(dataUrl);
        setHeadTeacherSignatureFile(file);
        setSignatureSettings(prev => ({ ...prev, head_teacher_signature: dataUrl }));
      }
      
      toast.success(`${type === 'principal' ? 'Principal' : 'Head Teacher'} signature uploaded`);
    };
    reader.readAsDataURL(file);
  };

  const saveSignatureSettings = async () => {
    try {
      setSaving(true);

      const query = signatureSettings.id 
        ? `UPDATE signature_settings SET 
            principal_name = ?, principal_signature = ?, principal_comment = ?,
            head_teacher_name = ?, head_teacher_signature = ?, head_teacher_comment = ?,
            resumption_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`
        : `INSERT INTO signature_settings (
            academic_year, term, principal_name, principal_signature, principal_comment,
            head_teacher_name, head_teacher_signature, head_teacher_comment, resumption_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const params = signatureSettings.id
        ? [
            signatureSettings.principal_name,
            signatureSettings.principal_signature,
            signatureSettings.principal_comment,
            signatureSettings.head_teacher_name,
            signatureSettings.head_teacher_signature,
            signatureSettings.head_teacher_comment,
            signatureSettings.resumption_date,
            signatureSettings.id
          ]
        : [
            signatureSettings.academic_year,
            signatureSettings.term,
            signatureSettings.principal_name,
            signatureSettings.principal_signature,
            signatureSettings.principal_comment,
            signatureSettings.head_teacher_name,
            signatureSettings.head_teacher_signature,
            signatureSettings.head_teacher_comment,
            signatureSettings.resumption_date
          ];

      const response = await fetch(`${API_CONFIG.BASE_URL}/database/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
        body: JSON.stringify({ query, params })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Signature settings saved successfully');
        if (!signatureSettings.id && result.insertId) {
          setSignatureSettings(prev => ({ ...prev, id: result.insertId }));
        }
      } else {
        toast.error('Failed to save signature settings');
      }
    } catch (error) {
      console.error('Error saving signature settings:', error);
      toast.error('Failed to save signature settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Signature Settings</h1>
          <p className="text-gray-600">Manage signatures and resumption dates for result sheets</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <span className="w-4 h-4 mr-1" />
          {signatureSettings.academic_year} - {signatureSettings.term}
        </Badge>
      </div>

      <Alert>
        <School className="h-4 w-4" />
        <AlertDescription>
          These settings will be automatically applied to all result sheets for the current academic year and term.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Principal Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-5 h-5" />
              Principal Settings (Secondary Section)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="principal_name">Principal Name</Label>
              <Input
                id="principal_name"
                value={signatureSettings.principal_name}
                onChange={(e) => setSignatureSettings(prev => ({ ...prev, principal_name: e.target.value }))}
                placeholder="Enter principal name"
              />
            </div>

            <div>
              <Label htmlFor="principalComment">Principal Comment (Default for Result Cards)</Label>
              <Textarea
                id="principalComment"
                value={signatureSettings.principal_comment}
                onChange={(e) => setSignatureSettings({...signatureSettings, principal_comment: e.target.value})}
                placeholder="Enter default comment for Principal's section on result cards"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Note: Class Teachers provide their own comments during result compilation</p>
            </div>

            <div>
              <Label>Principal Signature</Label>
              <div className="mt-2">
                {principalSignaturePreview ? (
                  <div className="border rounded p-2">
                    <img 
                      src={principalSignaturePreview} 
                      alt="Principal Signature" 
                      className="h-16 max-w-full object-contain"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setPrincipalSignaturePreview('');
                        setPrincipalSignatureFile(null);
                        setSignatureSettings(prev => ({ ...prev, principal_signature: null }));
                      }}
                    >
                      Remove Signature
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded p-4 text-center">
                    <span className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">Upload principal signature</p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'principal')}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Head Teacher Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-5 h-5" />
              Head Teacher Settings (Primary Section)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="head_teacher_name">Head Teacher Name</Label>
              <Input
                id="head_teacher_name"
                value={signatureSettings.head_teacher_name}
                onChange={(e) => setSignatureSettings(prev => ({ ...prev, head_teacher_name: e.target.value }))}
                placeholder="Enter head teacher name"
              />
            </div>

            <div>
              <Label htmlFor="head_teacher_comment">Head Teacher Comment (Default for Result Cards)</Label>
              <Textarea
                id="head_teacher_comment"
                value={signatureSettings.head_teacher_comment}
                onChange={(e) => setSignatureSettings(prev => ({ ...prev, head_teacher_comment: e.target.value }))}
                placeholder="Enter default comment for Head Teacher's section on result cards"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Note: Class Teachers provide their own comments during result compilation</p>
            </div>

            <div>
              <Label>Head Teacher Signature</Label>
              <div className="mt-2">
                {headTeacherSignaturePreview ? (
                  <div className="border rounded p-2">
                    <img 
                      src={headTeacherSignaturePreview} 
                      alt="Head Teacher Signature" 
                      className="h-16 max-w-full object-contain"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setHeadTeacherSignaturePreview('');
                        setHeadTeacherSignatureFile(null);
                        setSignatureSettings(prev => ({ ...prev, head_teacher_signature: null }));
                      }}
                    >
                      Remove Signature
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded p-4 text-center">
                    <span className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">Upload head teacher signature</p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'head_teacher')}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* School Resumption Date */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-5 h-5" />
            School Resumption Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label htmlFor="resumption_date">Next Term Resumption Date</Label>
            <Input
              id="resumption_date"
              type="date"
              value={signatureSettings.resumption_date}
              onChange={(e) => setSignatureSettings(prev => ({ ...prev, resumption_date: e.target.value }))}
            />
            <p className="text-sm text-gray-600 mt-1">
              This date will appear on all result sheets
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={saveSignatureSettings} 
          disabled={saving}
          className="min-w-[120px]"
        >
          <span className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
