import { LogOut, School, Bell, User, X } from 'lucide-react';
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Notification, useSchool } from "../contexts/SchoolContext";
import { useNotificationListener } from "../contexts/NotificationService";
import { toast } from "sonner";

interface DashboardTopBarProps {
  userName: string;
  userRole: string;
  notificationCount?: number;
  notifications?: Notification[];
  onLogout?: () => void;
  onNotificationClick?: () => void;
  onMarkAsRead?: (id: number) => void;
}

export function DashboardTopBar({ userName, userRole, notificationCount = 0, notifications = [], onLogout, onNotificationClick, onMarkAsRead }: DashboardTopBarProps) {
  const { currentUser, getUnreadNotifications, deleteNotification } = useSchool();
  
  // Set up notification listener
  useNotificationListener(currentUser?.role, currentUser?.id);
  
  // Get user-specific unread notifications
  const userUnreadNotifications = getUnreadNotifications();
  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] border-b border-[#1E40AF]/50 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        {/* Logo - Mobile */}
        <div className="lg:hidden flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/20 shadow-lg">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-white text-sm block">GRA Portal</span>
            <span className="text-white/70 text-xs">{userRole}</span>
          </div>
        </div>

        {/* Welcome Message - Desktop */}
        <div className="hidden lg:block">
          <p className="text-white text-sm mb-0.5">
            Welcome back, <span className="font-semibold text-white">{userName}</span>! 👋
          </p>
          <p className="text-white/70 text-xs">{userRole}</p>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <div className="relative cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all shadow-sm ring-1 ring-white/10 hover:ring-white/20">
                  <Bell className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                </div>
                {userUnreadNotifications.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 bg-[#EF4444] text-white border-2 border-[#2563EB] rounded-full text-xs animate-pulse shadow-lg">
                    {userUnreadNotifications.length > 9 ? '9+' : userUnreadNotifications.length}
                  </Badge>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <div className="p-4">
                <h4 className="font-medium leading-none">Notifications</h4>
                <p className="text-sm text-muted-foreground">You have {userUnreadNotifications.length} unread messages.</p>
              </div>
              <div className="grid gap-2 p-4 max-h-96 overflow-y-auto">
                {userUnreadNotifications.length > 0 ? (
                  userUnreadNotifications.slice(0, 5).map((notification) => (
                    <div key={notification.id} className="flex flex-col space-y-1 p-3 rounded-lg border bg-background hover:bg-accent/50 group">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium flex-1">{notification.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(notification.sentDate).toLocaleDateString()}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                          >
                            <X className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    <p>No notifications</p>
                  </div>
                )}
              </div>
              <div className="p-2 border-t">
                <Button size="sm" className="w-full" onClick={onNotificationClick}>View All</Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:from-white/30 hover:to-white/20 transition-all shadow-sm ring-1 ring-white/20 group">
              <User className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </div>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <Button
              onClick={() => {
                toast.success("Logged out successfully");
                onLogout();
              }}
              variant="ghost"
              className="hidden md:flex items-center gap-2 text-white hover:text-white hover:bg-white/20 rounded-xl px-4 py-2 h-10 transition-all ring-1 ring-white/10 hover:ring-white/20 backdrop-blur-sm shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
