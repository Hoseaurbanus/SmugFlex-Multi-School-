import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from '../../lib/utils';

interface AvatarProps extends React.ComponentProps<typeof AvatarPrimitive.Root> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  src?: string;
  fallback?: string;
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-lg",
};

const gradientColors = [
  'from-indigo-500 to-purple-500',
  'from-pink-500 to-rose-500',
  'from-cyan-500 to-blue-500',
  'from-orange-500 to-amber-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-indigo-500',
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradientColors[Math.abs(hash) % gradientColors.length];
}

function Avatar({ className, size = 'md', src, fallback, ...props }: AvatarProps) {
  const initials = fallback || '?';
  const gradient = getGradient(initials);

  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      <AvatarPrimitive.Image
        data-slot="avatar-image"
        className="aspect-square size-full object-cover"
        src={src}
      />
      <AvatarPrimitive.Fallback
        data-slot="avatar-fallback"
        className={cn(
          "flex size-full items-center justify-center rounded-full bg-gradient-to-br font-heading font-semibold text-white",
          gradient
        )}
      >
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

const AvatarImage = AvatarPrimitive.Image;
const AvatarFallback = AvatarPrimitive.Fallback;

export { Avatar, AvatarImage, AvatarFallback };
