import * as React from "react"
import { cn } from "../../lib/utils"

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export interface SelectContextValue {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ value, onValueChange, children, className }, ref) => {
    const [open, setOpen] = React.useState(false)
    
    const contextValue = React.useMemo(() => ({
      value,
      onValueChange,
      open,
      setOpen
    }), [value, onValueChange, open])
    
    return (
      <SelectContext.Provider value={contextValue}>
        <div ref={ref} className={cn("relative w-full", className)} data-select-root>
          {children}
        </div>
      </SelectContext.Provider>
    )
  }
)
Select.displayName = "Select"

export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectTrigger must be used within a Select")
    
    const { open, setOpen } = context
    
    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
        <svg
          className={cn("h-4 w-4 opacity-50", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

export interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string
}

export const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectValue must be used within a Select")
    
    const { value } = context
    
    return (
      <span ref={ref} className={cn("block truncate", className)} {...props}>
        {value || placeholder}
      </span>
    )
  }
)
SelectValue.displayName = "SelectValue"

export const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectContent must be used within a Select")
    
    const { open, setOpen } = context
    
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Element
        if (!target.closest('[data-select-root]')) {
          setOpen(false)
        }
      }
      
      if (open) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [open, setOpen])
    
    if (!open) return null
    
    return (
      <div
        ref={ref}
        className={cn(
          "absolute top-full left-0 right-0 z-[9999] min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md mt-1",
          className
        )}
        style={{ position: 'absolute', zIndex: 9999 }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectContent.displayName = "SelectContent"

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectItem must be used within a Select")
    
    const { onValueChange, setOpen, value: selectedValue } = context
    
    const handleClick = () => {
      onValueChange?.(value)
      setOpen(false)
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
          selectedValue === value && "bg-accent text-accent-foreground",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
        {selectedValue === value && (
          <svg
            className="absolute left-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        )}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"
