import * as React from "react";
import { cn } from '../../lib/utils';
import { FileX, Inbox, SearchX, UserX } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  variant?: 'default' | 'search' | 'data' | 'user';
  className?: string;
}

const defaultIcons = {
  default: <Inbox className="size-12" />,
  search: <SearchX className="size-12" />,
  data: <FileX className="size-12" />,
  user: <UserX className="size-12" />,
};

function EmptyState({ icon, title, description, action, variant = 'default', className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center",
      className
    )}>
      <div className="flex items-center justify-center size-20 rounded-2xl bg-muted mb-6">
        <span className="text-muted-foreground">
          {icon || defaultIcons[variant]}
        </span>
      </div>
      <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}

export { EmptyState };
