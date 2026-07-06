import React from 'react';
import { Bell, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export type NotificationSeverity = 'urgent' | 'warning' | 'routine' | 'info';

interface NotificationItemProps {
  id: number;
  title: string;
  message: string;
  severity: NotificationSeverity;
  timestamp?: Date;
  index?: number;
  onClick?: () => void;
}

export function NotificationItem({
  id,
  title,
  message,
  severity,
  timestamp,
  index = 0,
  onClick,
}: NotificationItemProps) {
  const severityConfig = {
    urgent: {
      bgClass: 'notification-urgent',
      icon: AlertCircle,
      borderClass: 'border-l-4 border-red-500',
      dotClass: 'bg-red-500 animate-pulse',
    },
    warning: {
      bgClass: 'notification-warning',
      icon: AlertTriangle,
      borderClass: 'border-l-4 border-amber-500',
      dotClass: 'bg-amber-500',
    },
    routine: {
      bgClass: 'notification-routine',
      icon: Bell,
      borderClass: 'border-l-4 border-[#0A2540]',
      dotClass: 'bg-[#0A2540]',
    },
    info: {
      bgClass: 'bg-slate-50 dark:bg-slate-900',
      icon: Info,
      borderClass: 'border-l-4 border-slate-500',
      dotClass: 'bg-slate-500',
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  const timeAgo = (date: Date | undefined) => {
    if (!date) return 'now';
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`flex items-start gap-4 px-5 py-4 hover:bg-opacity-80 transition-all cursor-pointer group ${config.bgClass} ${config.borderClass}`}
      role="article"
      tabIndex={0}
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
        <Icon className="w-4.5 h-4.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900">{title}</p>
          {severity === 'urgent' && (
            <div className={`flex-shrink-0 w-2 h-2 rounded-full ${config.dotClass}`} aria-label="Urgent" />
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1 truncate">{message}</p>
        <p className="text-xs text-slate-400 mt-1">{timeAgo(timestamp)}</p>
      </div>
    </motion.div>
  );
}
