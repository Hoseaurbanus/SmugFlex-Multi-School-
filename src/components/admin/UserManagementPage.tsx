import { useState } from "react";
import { useSchool } from "../../contexts/SchoolContext";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Plus } from 'lucide-react';
import { CreateUserPage } from "./CreateUserPage";
import { ManageUsersPage } from "./ManageUsersPage";

export function UserManagementPage() {
  const { users } = useSchool();
  const [activeView, setActiveView] = useState<"menu" | "create" | "manage">("menu");

  // Calculate role-based user counts
  const adminCount = users.filter(u => u.role === 'admin').length;
  const teacherCount = users.filter(u => u.role === 'teacher').length;
  const accountantCount = users.filter(u => u.role === 'accountant').length;
  const parentCount = users.filter(u => u.role === 'parent').length;

  if (activeView === "create") {
    return (
      <div className="space-y-6">
        <Button
          onClick={() => setActiveView("menu")}
          className="bg-[#0F243E] text-white hover:bg-[#132C4A] rounded-xl"
        >
          ← Back to User Management
        </Button>
        <CreateUserPage />
      </div>
    );
  }

  if (activeView === "manage") {
    return (
      <div className="space-y-6">
        <Button
          onClick={() => setActiveView("menu")}
          className="bg-[#0F243E] text-white hover:bg-[#132C4A] rounded-xl"
        >
          ← Back to User Management
        </Button>
        <ManageUsersPage />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">User Management</h1>
        <p className="text-[#C0C8D3]">Create and manage system users with role-based access</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create User Card */}
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg hover:shadow-2xl transition-all hover:scale-105 cursor-pointer group">
          <CardHeader className="p-6 bg-gradient-to-r from-[#28A745] to-[#28A745]/80 rounded-t-xl">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-white mb-2">Create User</h2>
            <p className="text-white/80 text-sm">Add new system user with role-based access</p>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-[#C0C8D3] text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#28A745]" />
                Create Admin, Teacher, Accountant, or Parent accounts
              </li>
              <li className="flex items-center gap-2 text-[#C0C8D3] text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#28A745]" />
                Auto-generate secure credentials
              </li>
              <li className="flex items-center gap-2 text-[#C0C8D3] text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#28A745]" />
                Send credentials via Email or SMS
              </li>
              <li className="flex items-center gap-2 text-[#C0C8D3] text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#28A745]" />
                Assign classes and subjects to teachers
              </li>
            </ul>
            <Button
              onClick={() => setActiveView("create")}
              className="w-full h-12 bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md group-hover:scale-105 transition-all"
            >
              Create New User
              <span className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Manage Users Card */}
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg hover:shadow-2xl transition-all hover:scale-105 cursor-pointer group">
          <CardHeader className="p-6 bg-gradient-to-r from-[#1E90FF] to-[#00BFFF] rounded-t-xl">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
              <span className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-white mb-2">Manage Users</h2>
            <p className="text-white/80 text-sm">View, edit, and manage all system users</p>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-[#C0C8D3] text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1E90FF]" />
                View and search all users by role
              </li>
              <li className="flex items-center gap-2 text-[#C0C8D3] text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1E90FF]" />
                Reset passwords and resend credentials
              </li>
              <li className="flex items-center gap-2 text-[#C0C8D3] text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1E90FF]" />
                Activate or deactivate user accounts
              </li>
              <li className="flex items-center gap-2 text-[#C0C8D3] text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1E90FF]" />
                Import/export users via CSV
              </li>
            </ul>
            <Button
              onClick={() => setActiveView("manage")}
              className="w-full h-12 bg-[#1E90FF] hover:bg-[#00BFFF] text-white rounded-xl shadow-md group-hover:scale-105 transition-all"
            >
              Manage Users
              <span className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1 text-sm">Total Users</p>
            <p className="text-white text-2xl">{users.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1 text-sm">Admins</p>
            <p className="text-[#DC3545] text-2xl">{adminCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1 text-sm">Teachers</p>
            <p className="text-[#1E90FF] text-2xl">{teacherCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1 text-sm">Accountants</p>
            <p className="text-[#FFC107] text-2xl">{accountantCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1 text-sm">Parents</p>
            <p className="text-[#28A745] text-2xl">{parentCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
