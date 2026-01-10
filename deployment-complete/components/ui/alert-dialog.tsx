import * as React from "react"
import { cn } from "../../lib/utils"

export interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

export const AlertDialog = React.forwardRef<HTMLDivElement, AlertDialogProps>(
  ({ className, children, open = false, onOpenChange, ...props }, ref) => {
    if (!open) return null;
    
    return (
      <div ref={ref} className={cn("fixed inset-0 z-50 flex items-center justify-center", className)} {...props}>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50" 
          onClick={() => onOpenChange?.(false)}
        />
        {/* Content */}
        {children}
      </div>
    )
  }
)
AlertDialog.displayName = "AlertDialog"

export const AlertDialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn("relative w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg z-50", className)} 
      onClick={(e) => e.stopPropagation()}
      {...props} 
    />
  )
)
AlertDialogContent.displayName = "AlertDialogContent"

export const AlertDialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
  )
)
AlertDialogHeader.displayName = "AlertDialogHeader"

export const AlertDialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
  )
)
AlertDialogFooter.displayName = "AlertDialogFooter"

export const AlertDialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  )
)
AlertDialogTitle.displayName = "AlertDialogTitle"

export const AlertDialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
)
AlertDialogDescription.displayName = "AlertDialogDescription"

export const AlertDialogAction = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button ref={ref} className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2", className)} {...props} />
  )
)
AlertDialogAction.displayName = "AlertDialogAction"

export const AlertDialogCancel = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button ref={ref} className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2", className)} {...props} />
  )
)
AlertDialogCancel.displayName = "AlertDialogCancel"
