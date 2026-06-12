// =============================================================================
// COLLAPSIBLE SIDEBAR — v0.44.1
// =============================================================================
// Drop-in wrapper for workspace sidebars that are hidden on mobile.
// On desktop (lg+): renders children as-is (inline sidebar).
// On mobile (<lg): adds a floating toggle button + sheet overlay.
//
// USAGE — wrap existing sidebar div:
//
//   <CollapsibleSidebar title="Document Tree" side="left">
//     <div className="hidden lg:flex w-72 border-r ...">
//       ...existing sidebar content...
//     </div>
//   </CollapsibleSidebar>
//
// The component clones the sidebar children and removes "hidden lg:flex"
// / "hidden lg:block" when rendering inside the mobile sheet, so the
// content is visible in the overlay.
// =============================================================================


import React, { useState, ReactNode, cloneElement, isValidElement, Children } from 'react';
import { PanelLeft, PanelRight, X } from 'lucide-react';
import { ScrollFadeContainer } from '@/components/ui/ScrollFadeContainer';

interface CollapsibleSidebarProps {
  children: ReactNode;
  /** Sheet title shown in mobile overlay header */
  title?: string;
  /** Which side the sidebar is on */
  side?: 'left' | 'right';
  /** Icon for the toggle button (defaults to panel icon) */
  icon?: ReactNode;
  /** z-index for the overlay (default 40) */
  zIndex?: number;
  /** Additional class for the toggle button */
  buttonClassName?: string;
}

/**
 * Strip "hidden lg:flex" / "hidden lg:block" / "hidden xl:flex" / "hidden xl:block" 
 * from a className string so sidebar content is visible in the mobile sheet.
 */
function stripHiddenClass(className: string): string {
  return className
    .replace(/\bhidden\s+(lg|xl):(flex|block)\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Recursively clone the top-level element and strip hidden classes
 * so the sidebar content renders in the mobile sheet.
 */
function cloneForMobile(node: ReactNode): ReactNode {
  if (!isValidElement(node)) return node;
  
  const el = node as React.ReactElement<{ className?: string; children?: ReactNode }>;
  const props = el.props;
  
  const newProps: Record<string, unknown> = {};
  
  if (typeof props.className === 'string' && /hidden\s+(lg|xl):/.test(props.className)) {
    newProps.className = stripHiddenClass(props.className);
  }
  
  // Override width to fill the sheet
  if (typeof props.className === 'string' && /\bw-(?:64|72|80|96|\[\d+px\])/.test(props.className)) {
    const strippedWidth = (newProps.className as string || props.className)
      .replace(/\bw-(?:64|72|80|96|\[\d+px\])\b/g, 'w-full');
    newProps.className = strippedWidth;
  }
  
  if (Object.keys(newProps).length > 0) {
    return cloneElement(el, newProps);
  }
  
  return node;
}

export function CollapsibleSidebar({
  children,
  title = 'Navigation',
  side = 'left',
  icon,
  zIndex = 40,
  buttonClassName = '',
}: CollapsibleSidebarProps) {
  const [open, setOpen] = useState(false);
  
  const DefaultIcon = side === 'left' ? PanelLeft : PanelRight;
  const toggleIcon = icon || <DefaultIcon className="w-5 h-5" />;
  
  // Position the toggle button
  const buttonPosition = side === 'left' 
    ? 'left-3 top-3' 
    : 'right-3 top-3';
  
  const sheetPosition = side === 'left'
    ? 'left-0 top-0'
    : 'right-0 top-0';
  
  const slideClass = side === 'left'
    ? 'animate-slide-in-left'
    : 'animate-slide-in-right';

  return (
    <>
      {/* Desktop: render sidebar inline as-is */}
      {children}
      
      {/* Mobile: floating toggle button — only shows when sidebar is hidden */}
      <button
        onClick={() => setOpen(true)}
        className={`
          lg:hidden fixed ${buttonPosition} z-30
          p-2.5 bg-surface-elevated border border-border rounded-lg shadow-lg
          text-text-secondary hover:text-text-primary hover:bg-surface-card
          transition-colors
          ${buttonClassName}
        `}
        aria-label={`Open ${title}`}
        style={{ zIndex: zIndex - 1 }}
      >
        {toggleIcon}
      </button>
      
      {/* Mobile: sheet overlay */}
      {open && (
        <div 
          className="lg:hidden fixed inset-0"
          style={{ zIndex }}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          
          {/* Sheet panel */}
          <div 
            className={`
              absolute ${sheetPosition} h-full w-80 max-w-[85vw]
              bg-surface-elevated border-border overflow-auto
              ${side === 'left' ? 'border-r' : 'border-l'}
              ${slideClass}
            `}
          >
            {/* Header with close button */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b border-border bg-surface-elevated">
              <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-surface-card rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            
            {/* Sidebar content — cloned with hidden classes stripped */}
            <ScrollFadeContainer direction="vertical" className="overflow-auto flex-1">
              {Children.map(children, child => cloneForMobile(child))}
            </ScrollFadeContainer>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * CollapsibleRightPanel — same concept for right-side detail panels.
 * Hidden at xl breakpoint instead of lg.
 */
export function CollapsibleRightPanel({
  children,
  title = 'Details',
  icon,
  zIndex = 40,
  buttonClassName = '',
}: Omit<CollapsibleSidebarProps, 'side'>) {
  const [open, setOpen] = useState(false);
  const toggleIcon = icon || <PanelRight className="w-5 h-5" />;

  return (
    <>
      {/* Desktop: render panel inline */}
      {children}
      
      {/* Mobile/Tablet: toggle button */}
      <button
        onClick={() => setOpen(true)}
        className={`
          xl:hidden fixed right-3 top-3 z-30
          p-2.5 bg-surface-elevated border border-border rounded-lg shadow-lg
          text-text-secondary hover:text-text-primary hover:bg-surface-card
          transition-colors
          ${buttonClassName}
        `}
        aria-label={`Open ${title}`}
        style={{ zIndex: zIndex - 1 }}
      >
        {toggleIcon}
      </button>
      
      {/* Mobile: sheet from right */}
      {open && (
        <div 
          className="xl:hidden fixed inset-0"
          style={{ zIndex }}
        >
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-surface-elevated border-l border-border overflow-auto animate-slide-in-right">
            <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b border-border bg-surface-elevated">
              <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-surface-card rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            <ScrollFadeContainer direction="vertical" className="overflow-auto flex-1">
              {Children.map(children, child => cloneForMobile(child))}
            </ScrollFadeContainer>
          </div>
        </div>
      )}
    </>
  );
}

export default CollapsibleSidebar;
