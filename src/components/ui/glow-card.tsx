import * as React from "react";
import { cn } from '../../lib/utils';

interface GlowCardProps extends React.ComponentProps<"div"> {
  glowColor?: 'indigo' | 'pink' | 'cyan' | 'orange' | 'emerald';
}

const glowColors = {
  indigo: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]',
  pink: 'hover:shadow-[0_0_30px_rgba(236,72,153,0.3)]',
  cyan: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]',
  orange: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.3)]',
  emerald: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
};

function GlowCard({ className, glowColor = 'indigo', children, ...props }: GlowCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border p-6 transition-all duration-300",
        glowColors[glowColor],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { GlowCard };
