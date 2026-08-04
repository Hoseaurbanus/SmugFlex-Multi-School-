import React from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Checkbox } from '../../ui/checkbox';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../ui/alert-dialog';

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  resetViaEmail: boolean;
  resetViaSMS: boolean;
  isLoading: boolean;
  onEmailChange: (checked: boolean) => void;
  onSMSChange: (checked: boolean) => void;
  onConfirm: () => void;
}

export function ResetPasswordDialog({ open, onOpenChange, username, resetViaEmail, resetViaSMS, isLoading, onEmailChange, onSMSChange, onConfirm }: ResetPasswordDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Password</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reset the password for {username}? A temporary password will be generated and shown to you.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="reset-email" checked={resetViaEmail} onCheckedChange={(checked: boolean) => onEmailChange(checked)} />
            <Label htmlFor="reset-email">Send via Email</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="reset-sms" checked={resetViaSMS} onCheckedChange={(checked: boolean) => onSMSChange(checked)} />
            <Label htmlFor="reset-sms">Send via SMS</Label>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={isLoading}>{isLoading ? 'Resetting...' : 'Reset Password'}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeactivateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userStatus: string;
  username: string;
  isLoading: boolean;
  onConfirm: () => void;
}

export function DeactivateDialog({ open, onOpenChange, userStatus, username, isLoading, onConfirm }: DeactivateDialogProps) {
  const isActive = userStatus === 'Active';
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isActive ? 'Deactivate User' : 'Activate User'}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to {isActive ? 'deactivate' : 'activate'} {username}? {isActive ? 'The user will not be able to access the system.' : 'The user will regain access to the system.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={isLoading} className={isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}>
            {isLoading ? 'Processing...' : (isActive ? 'Deactivate User' : 'Activate User')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  role: string;
  isLoading: boolean;
  onConfirm: () => void;
}

export function DeleteUserDialog({ open, onOpenChange, username, role, isLoading, onConfirm }: DeleteUserDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {username}? This action cannot be undone.
            <br /><br />
            <strong>Warning:</strong> This will permanently remove the user and all their associated data from the system.
            {role === 'teacher' && ' This includes all teacher records, subject assignments, and related data.'}
            {role === 'parent' && ' This includes all parent records and student links.'}
            {role === 'accountant' && ' This includes all accountant records and financial data.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={isLoading} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
            {isLoading ? 'Deleting...' : 'Delete User'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
