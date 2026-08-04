import React from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';

interface SelectedUser {
  id?: number | string;
  username: string;
  email: string;
  role: string;
  status: string;
  last_login?: string | null;
  created_at?: string;
  updated_at?: string;
  linked_id?: number | string | null;
  [key: string]: unknown;
}

interface ViewUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: SelectedUser | null;
}

export function ViewUserDialog({ open, onOpenChange, selectedUser }: ViewUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>View detailed information for {selectedUser?.username}</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Username</Label>
            <p className="text-sm">{selectedUser?.username}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Email</Label>
            <p className="text-sm">{selectedUser?.email}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Role</Label>
            <Badge variant={selectedUser?.role === 'admin' ? 'destructive' : 'secondary'}>{selectedUser?.role}</Badge>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Badge variant={selectedUser?.status === 'Active' ? 'default' : 'secondary'}>{selectedUser?.status}</Badge>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Last Login</Label>
            <p className="text-sm">{selectedUser?.last_login || 'Never'}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Created At</Label>
            <p className="text-sm">{new Date(selectedUser?.created_at || '').toLocaleDateString()}</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
