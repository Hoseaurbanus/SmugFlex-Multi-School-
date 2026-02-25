import { Menu } from 'lucide-react';
import { ReactNode, useState, useCallback, memo } from "react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import schoolLogo from "../assets/images/school-logo.jpg";

// Sidebar Token Configuration
export const SIDEBAR_TOKENS = {
  // Layout Tokens
  SIDEBAR_WIDTH: 'w-64',
  SIDEBAR_HEIGHT: 'h-screen',
  SIDEBAR_POSITION: 'fixed',
  SIDEBAR_Z_INDEX: 'z-40',
  
  // Color Tokens
  SIDEBAR_BG: 'bg-[#1E293B]',
  SIDEBAR_BORDER: 'border-[#334155]/50',
  ACTIVE_ITEM_BG: 'bg-[#2563EB]',
  ACTIVE_ITEM_BORDER: 'border-[#2563EB]',
  HOVER_ITEM_BG: 'hover:bg-[#374151]',
  
  // Spacing Tokens
  SIDEBAR_PADDING: 'p-3',
  HEADER_PADDING: 'p-5',
  ITEM_PADDING: 'p-3',
  ITEM_GAP: 'gap-3',
  
  // Typography Tokens
  HEADER_TEXT_COLOR: 'text-white',
  MOTTO_TEXT_COLOR: 'text-[#FFD700]',
  ITEM_TEXT_COLOR: 'text-[#9CA3AF]',
  ACTIVE_ITEM_TEXT_COLOR: 'text-white',
  HOVER_ITEM_TEXT_COLOR: 'hover:text-white',
  
  // Animation Tokens
  TRANSITION_DURATION: 'duration-200',
  TRANSITION_EASE: 'ease-in-out',
  MOBILE_TRANSITION: 'duration-300',
  
  // Interactive Tokens
  ITEM_ROUNDED: 'rounded-lg',
  BUTTON_ROUNDED: 'rounded-lg',
  SHADOW_HOVER: 'hover:shadow-lg',
  SHADOW_ACTIVE: 'shadow-md',
  
  // Responsive Tokens
  MOBILE_BREAKPOINT: 'lg:hidden',
  DESKTOP_BREAKPOINT: 'hidden lg:flex',
  MOBILE_WIDTH: 'w-72',
  
  // Accessibility Tokens
  NAV_ROLE: 'navigation',
  ARIA_LABEL: 'Main navigation',
  BUTTON_ARIA_LABEL: 'Open navigation menu',
  CLOSE_ARIA_LABEL: 'Close navigation menu',
} as const;

interface SidebarItem {
  icon: ReactNode;
  label: string;
  id: string;
}

interface DashboardSidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  schoolName?: string;
  themeColor?: string;
}

const DashboardSidebar = memo(function DashboardSidebar({ 
  items, 
  activeItem, 
  onItemClick, 
  schoolName = "Graceland Royal Academy", 
  themeColor = "#3B82F6" 
}: DashboardSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Optimized click handler for immediate response
  const handleItemClick = (itemId: string) => {
    onItemClick(itemId);
    setIsOpen(false);
  };

  // Memoized menu toggle handlers
  const openMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const SidebarContent = () => (
    <>
      {/* Sidebar Header - Enhanced */}
      <div className={`${SIDEBAR_TOKENS.HEADER_PADDING} ${SIDEBAR_TOKENS.SIDEBAR_BORDER} bg-gradient-to-b from-[#1E293B] to-[#1E293B]/95`}>
        <div className={`flex items-center ${SIDEBAR_TOKENS.ITEM_GAP} mb-2`}>
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-gray-100 flex items-center justify-center flex-shrink-0 shadow-xl p-2 ring-4 ring-[#3B82F6]/30 hover:ring-[#3B82F6]/50 transition-all">
            <img 
              src={schoolLogo} 
              alt={`${schoolName} Logo`} 
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`${SIDEBAR_TOKENS.HEADER_TEXT_COLOR} truncate font-semibold`}>
              {schoolName}
            </h3>
            <p className={`${SIDEBAR_TOKENS.MOTTO_TEXT_COLOR} text-xs italic`}>Wisdom & Illumination</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className={`${SIDEBAR_TOKENS.MOBILE_BREAKPOINT} text-[#94A3B8] ${SIDEBAR_TOKENS.HOVER_ITEM_TEXT_COLOR} ${SIDEBAR_TOKENS.HOVER_ITEM_BG} ${SIDEBAR_TOKENS.ITEM_ROUNDED} ${SIDEBAR_TOKENS.ITEM_PADDING} transition-all pointer-events-auto touch-manipulation`}
            aria-label={SIDEBAR_TOKENS.CLOSE_ARIA_LABEL}
            title={SIDEBAR_TOKENS.CLOSE_ARIA_LABEL}
            type="button"
            style={{
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              userSelect: 'none'
            }}
          >
            <span className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sidebar Items */}
      <nav 
        className="flex-1 p-3 overflow-y-auto"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={cn(
                "w-full p-3 flex items-center gap-3 rounded-lg",
                "transition-colors duration-200",
                "hover:bg-[#374151] hover:text-white",
                "focus:bg-[#374151] focus:text-white focus:outline-none",
                activeItem === item.id 
                  ? "bg-[#2563EB] text-white" 
                  : "text-[#9CA3AF]"
              )}
              aria-current={activeItem === item.id ? "page" : undefined}
              aria-label={`Navigate to ${item.label}`}
              title={item.label}
              type="button"
            >
              <span className="flex-shrink-0 w-5 h-5">
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        onClick={openMenu}
        className={`${SIDEBAR_TOKENS.MOBILE_BREAKPOINT} fixed top-4 left-4 ${SIDEBAR_TOKENS.SIDEBAR_Z_INDEX} bg-[#3B82F6] text-white hover:bg-[#2563EB] ${SIDEBAR_TOKENS.BUTTON_ROUNDED} w-10 h-10 p-0 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 pointer-events-auto touch-manipulation`}
        aria-expanded={isOpen}
        aria-controls="mobile-sidebar"
        title={SIDEBAR_TOKENS.BUTTON_ARIA_LABEL}
        type="button"
        style={{
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          userSelect: 'none'
        }}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className={`${SIDEBAR_TOKENS.MOBILE_BREAKPOINT} fixed inset-0 bg-black/50 ${SIDEBAR_TOKENS.SIDEBAR_Z_INDEX} backdrop-blur-sm`}
          onClick={closeMenu}
          aria-hidden="true"
          style={{
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        id="mobile-sidebar"
        className={cn(
          `${SIDEBAR_TOKENS.MOBILE_BREAKPOINT} fixed top-0 left-0 right-0 bottom-0 ${SIDEBAR_TOKENS.MOBILE_WIDTH} ${SIDEBAR_TOKENS.SIDEBAR_BG} ${SIDEBAR_TOKENS.SIDEBAR_Z_INDEX} flex flex-col transition-${SIDEBAR_TOKENS.MOBILE_TRANSITION} shadow-2xl`,
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          height: '100vh',
          maxHeight: '100vh',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          WebkitTapHighlightColor: 'transparent'
        }}
        aria-label="Mobile navigation sidebar"
      >
        <SidebarContent />
      </aside>

      {/* Sidebar - Desktop */}
      <aside 
        className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 bg-[#1E293B] flex-col z-40"
        style={{ height: '100vh' }}
        aria-label="Desktop navigation sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-[#334155]/50 bg-gradient-to-b from-[#1E293B] to-[#1E293B]/95">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-gray-100 flex items-center justify-center flex-shrink-0 shadow-xl p-2 ring-4 ring-[#3B82F6]/30 hover:ring-[#3B82F6]/50 transition-all">
                <img 
                  src={schoolLogo} 
                  alt={`${schoolName} Logo`} 
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white truncate font-semibold">
                  {schoolName}
                </h3>
                <p className="text-[#FFD700] text-xs italic">Wisdom & Illumination</p>
              </div>
            </div>
          </div>
          
          <nav 
            className="flex-1 p-3 overflow-y-auto"
            role="navigation"
            aria-label="Main navigation"
          >
            <div className="space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    "w-full p-3 flex items-center gap-3 rounded-lg",
                    "transition-colors duration-200",
                    "hover:bg-[#374151] hover:text-white",
                    "focus:bg-[#374151] focus:text-white focus:outline-none",
                    activeItem === item.id 
                      ? "bg-[#2563EB] text-white" 
                      : "text-[#9CA3AF]"
                  )}
                  aria-current={activeItem === item.id ? "page" : undefined}
                  aria-label={`Navigate to ${item.label}`}
                  title={item.label}
                  type="button"
                >
                  <span className="flex-shrink-0 w-5 h-5">
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
});

export { DashboardSidebar };
