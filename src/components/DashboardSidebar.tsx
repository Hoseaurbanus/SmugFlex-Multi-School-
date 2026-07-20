import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ReactNode, useState, useEffect, useCallback, memo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface SidebarItem {
  icon: ReactNode;
  label: string;
  id: string;
}

interface SidebarSection {
  label: string;
  ids: string[];
}

interface DashboardSidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  sections?: SidebarSection[];
  schoolName?: string;
  footer?: ReactNode;
}

const sidebarVariants = {
  hidden: { x: -280, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
  exit: { x: -280, opacity: 0, transition: { duration: 0.2 } },
};

const COLLAPSED_KEY = 'smugflex-sidebar-collapsed';

const DashboardSidebar = memo(function DashboardSidebar({
  items,
  activeItem,
  onItemClick,
  sections,
  footer,
}: DashboardSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === 'true'; } catch { return false; }
  });
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(isCollapsed));
      document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '68px' : '256px');
    } catch {}
  }, [isCollapsed]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '68px' : '256px');
  }, []);

  useEffect(() => {
    if (!navRef.current) return;
    const activeEl = navRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeItem]);

  const handleItemClick = useCallback((itemId: string) => {
    onItemClick(itemId);
    setIsOpen(false);
  }, [onItemClick]);

  const filteredSections = sections
    ? sections
        .map(s => ({ ...s, items: items.filter(item => s.ids.includes(item.id)) }))
        .filter(s => s.items.length > 0)
    : [{ label: '', items }];

  const sectionedIds = sections ? new Set(sections.flatMap(s => s.ids)) : new Set();
  const unmatchedItems = sections ? items.filter(item => !sectionedIds.has(item.id)) : [];

  const toggleCollapse = useCallback(() => setIsCollapsed(p => !p), []);

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Header — no logo, just collapse toggle */}
      <div className={cn(
        "flex items-center justify-end border-b border-white/[0.06]",
        isMobile ? "px-3 py-3" : "px-3 py-3"
      )}>
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}
        {isMobile && (
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav ref={navRef} className="flex-1 py-3 px-2 overflow-y-auto sidebar-scrollbar">
        <div className="space-y-5">
          {filteredSections.map((section) => (
            <div key={section.label || 'nav'}>
              {section.label && (
                <div className={cn(
                  "px-2.5 mb-1.5 text-[10px] font-heading font-semibold uppercase tracking-[0.12em] text-white/20",
                  isCollapsed && "text-center px-0"
                )}>
                  {isCollapsed ? section.label.charAt(0) : section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = activeItem === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      data-active={isActive ? "true" : undefined}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "w-full flex items-center rounded-lg text-left transition-all duration-150 group relative",
                        isCollapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-2.5 py-2",
                        isActive
                          ? "bg-white/[0.08] text-white"
                          : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-gradient-to-b from-indigo-400 to-purple-400" />
                      )}
                      <span className={cn(
                        "flex-shrink-0 transition-colors duration-150",
                        isActive ? "text-indigo-400" : "text-white/40 group-hover:text-white/60"
                      )}>
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <span className="font-heading font-medium text-[13px] truncate">{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {unmatchedItems.length > 0 && (
            <div>
              <div className="space-y-0.5">
                {unmatchedItems.map((item) => {
                  const isActive = activeItem === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      data-active={isActive ? "true" : undefined}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "w-full flex items-center rounded-lg text-left transition-all duration-150 group relative",
                        isCollapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-2.5 py-2",
                        isActive
                          ? "bg-white/[0.08] text-white"
                          : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-gradient-to-b from-indigo-400 to-purple-400" />
                      )}
                      <span className={cn(
                        "flex-shrink-0 transition-colors duration-150",
                        isActive ? "text-indigo-400" : "text-white/40 group-hover:text-white/60"
                      )}>
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <span className="font-heading font-medium text-[13px] truncate">{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      {footer && (
        <div className={cn(
          "border-t border-white/[0.06] px-3 py-3",
          isCollapsed && "px-2"
        )}>
          {footer}
        </div>
      )}

      {!footer && (
        <div className={cn(
          "border-t border-white/[0.06] px-3 py-2.5",
          isCollapsed && "text-center"
        )}>
          <p className="text-[10px] text-white/10 font-medium tracking-wide">
            {isCollapsed ? '2.0' : 'SmugFlex 2.0'}
          </p>
        </div>
      )}
    </div>
  );

  const sidebarWidth = isCollapsed ? 'w-[68px]' : 'w-[256px]';

  return (
    <>
      {/* Mobile hamburger */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-[#18181B] shadow-lg border border-white/[0.06] flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition-all duration-150"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </motion.button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.aside
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[min(280px,85vw)] bg-[#18181B] z-50 flex flex-col overflow-hidden shadow-2xl"
            >
              <SidebarContent isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex fixed top-0 left-0 bottom-0 bg-[#18181B] flex-col z-40 transition-all duration-200",
        sidebarWidth
      )}>
        <SidebarContent />
      </aside>
    </>
  );
});

export { DashboardSidebar };
export type { SidebarSection, SidebarItem };
