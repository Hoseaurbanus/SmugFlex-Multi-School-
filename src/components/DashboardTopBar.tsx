import { LogOut, Bell, ChevronDown, X, User, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Notification, useSchool } from "../contexts/SchoolContext";
import { useNotificationListener } from "../contexts/NotificationService";
import { toast } from "sonner";

interface DashboardTopBarProps {
  userName: string;
  userRole: string;
  schoolName?: string;
  notificationCount?: number;
  notifications?: Notification[];
  onLogout?: () => void;
  onNotificationClick?: () => void;
  onMarkAsRead?: (id: number) => void;
  onChangePasswordClick?: () => void;
}

export function DashboardTopBar({ userName, userRole, schoolName = '', notificationCount = 0, notifications = [], onLogout, onNotificationClick, onMarkAsRead, onChangePasswordClick }: DashboardTopBarProps) {
  const { currentUser, getUnreadNotifications, deleteNotification } = useSchool();
  useNotificationListener(currentUser?.role, currentUser?.id);
  const userUnreadNotifications = getUnreadNotifications();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-border min-h-[52px]">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-2.5 md:py-3">
        {/* Left: Page Title / Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile: School Info */}
          <div className="lg:hidden flex items-center gap-3 min-w-0">
            <Avatar size="sm" src={undefined} fallback={schoolName || 'S'} />
            <div className="min-w-0">
              <span className="text-foreground text-[13px] font-heading font-semibold block leading-tight truncate max-w-[180px] sm:max-w-none">
                {schoolName || 'School Portal'}
              </span>
              <span className="text-muted-foreground text-xs">{userRole}</span>
            </div>
          </div>

          {/* Desktop: Greeting */}
          <div className="hidden lg:block">
            <p className="text-foreground text-[15px] font-heading font-semibold">
              {greeting}, <span className="text-primary">{userName}</span>
            </p>
            <p className="text-muted-foreground text-xs mt-0.5 font-medium">
              {schoolName} — {userRole}
            </p>
          </div>
        </div>

        {/* Center: Empty (reserved for future search) */}
        <div className="hidden md:flex flex-1 justify-center px-8" />

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors border border-border"
              >
                <Bell className="w-[18px] h-[18px] text-muted-foreground" />
                <AnimatePresence>
                  {userUnreadNotifications.length > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 z-10"
                    >
                      <Badge className="min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-2 border-white rounded-full text-[11px] font-bold shadow-md shadow-indigo-500/25">
                        {userUnreadNotifications.length > 9 ? '9+' : userUnreadNotifications.length}
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] p-0 shadow-lg border-border" align="end">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-heading font-semibold text-[13px] text-foreground">Notifications</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{userUnreadNotifications.length} unread messages</p>
                  </div>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {userUnreadNotifications.length > 0 ? (
                  userUnreadNotifications.slice(0, 5).map((notification, idx) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bell className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{notification.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{notification.message}</p>
                        <span className="text-[11px] text-muted-foreground/60 mt-1 block">
                          {new Date(notification.sentDate).toLocaleDateString()}
                        </span>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 opacity-50 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <X className="w-3 h-3 text-red-400" />
                      </motion.button>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No notifications</p>
                  </div>
                )}
              </div>
              {userUnreadNotifications.length > 0 && (
                <div className="p-3 border-t border-border">
                  <Button size="sm" variant="ghost" className="w-full text-xs font-medium text-primary hover:text-primary-hover hover:bg-primary/5" onClick={onNotificationClick}>
                    View All Notifications
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* User Profile */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-all border border-border active:scale-95"
              >
                <Avatar size="sm" src={undefined} fallback={userName} />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-foreground leading-tight">{userName}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{userRole}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1.5 shadow-lg border-border" align="end">
              <div className="space-y-1">
                {/* User info header */}
                <div className="px-3 py-2.5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Avatar size="md" src={undefined} fallback={userName} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-heading font-semibold text-foreground truncate">{userName}</p>
                      <p className="text-xs text-muted-foreground font-medium">{userRole}</p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    onClick={() => {
                      toast.info('Profile page coming soon');
                    }}
                  >
                    <User className="w-4 h-4 text-muted-foreground/60" />
                    Profile
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    onClick={() => {
                      toast.info('Settings page coming soon');
                    }}
                  >
                    <Settings className="w-4 h-4 text-muted-foreground/60" />
                    Settings
                  </motion.button>
                  {onChangePasswordClick && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                      onClick={onChangePasswordClick}
                    >
                      <svg className="w-4 h-4 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Change Password
                    </motion.button>
                  )}
                </div>

                {/* Logout */}
                {onLogout && (
                  <>
                    <div className="border-t border-border my-1" />
                    <div className="py-1">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-danger hover:bg-danger-light rounded-lg transition-colors"
                        onClick={() => {
                          toast.success("Logged out successfully");
                          onLogout();
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </motion.button>
                    </div>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
