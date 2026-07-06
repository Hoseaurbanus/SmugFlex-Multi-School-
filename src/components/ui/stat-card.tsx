import * as React from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'indigo' | 'pink' | 'cyan' | 'orange' | 'emerald' | 'violet';
  className?: string;
}

const colorMap = {
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
    dark: 'dark:bg-indigo-500/10 dark:text-indigo-400',
  },
  pink: {
    bg: 'bg-pink-50',
    icon: 'text-pink-600',
    iconBg: 'bg-pink-100',
    dark: 'dark:bg-pink-500/10 dark:text-pink-400',
  },
  cyan: {
    bg: 'bg-cyan-50',
    icon: 'text-cyan-600',
    iconBg: 'bg-cyan-100',
    dark: 'dark:bg-cyan-500/10 dark:text-cyan-400',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    iconBg: 'bg-orange-100',
    dark: 'dark:bg-orange-500/10 dark:text-orange-400',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    dark: 'dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  violet: {
    bg: 'bg-violet-50',
    icon: 'text-violet-600',
    iconBg: 'bg-violet-100',
    dark: 'dark:bg-violet-500/10 dark:text-violet-400',
  },
};

function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.5,
      ease: "easeOut",
    });

    const unsubscribe = rounded.on("change", (v) => setDisplayValue(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, count, rounded]);

  return <>{displayValue.toLocaleString()}</>;
}

function StatCard({ title, value, icon, trend, trendValue, color = 'indigo', className }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all duration-200 cursor-default group",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-3xl font-heading font-bold text-foreground mt-1">
            {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
          </p>
          {trend && trendValue && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              trend === 'up' && "text-emerald-600",
              trend === 'down' && "text-rose-600",
              trend === 'neutral' && "text-muted-foreground",
            )}>
              <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "flex items-center justify-center size-12 rounded-xl transition-transform duration-200 group-hover:scale-110",
          colors.iconBg,
          colors.dark,
        )}>
          <span className={cn(colors.icon, colors.dark)}>{icon}</span>
        </div>
      </div>
    </motion.div>
  );
}

export { StatCard };
