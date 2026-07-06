import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrendIndicatorProps {
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  color?: 'success' | 'warning' | 'danger' | 'muted';
}

export function TrendIndicator({ value, trend, color = 'success' }: TrendIndicatorProps) {
  const colorClasses = {
    success: 'text-green-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
    muted: 'text-slate-400',
  };

  const bgClasses = {
    success: 'bg-green-50 dark:bg-green-950/20',
    warning: 'bg-amber-50 dark:bg-amber-950/20',
    danger: 'bg-red-50 dark:bg-red-950/20',
    muted: 'bg-slate-50 dark:bg-slate-900/20',
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      case 'stable':
        return <Minus className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${bgClasses[color]} ${colorClasses[color]}`}
    >
      {getTrendIcon()}
      <span>{value}</span>
    </motion.div>
  );
}
