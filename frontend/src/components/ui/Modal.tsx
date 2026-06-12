
import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

// Modal sizes
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  children,
  footer,
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeOnEscape, isOpen, onClose]);
  
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    firstElement?.focus();
    
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        className={`
          relative w-full ${sizeStyles[size]}
          bg-surface-elevated border border-border rounded-xl shadow-modal
          flex flex-col max-h-[90vh]
          animate-in fade-in zoom-in-95 duration-200
          ${className}
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-5 border-b border-border">
            <div>
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="text-sm text-text-muted mt-1">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 -mr-1.5 -mt-1.5 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Confirmation Dialog - specialized modal for confirmations
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const buttonVariant = variant === 'danger' ? 'danger' : variant === 'warning' ? 'primary' : 'primary';
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={buttonVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{message}</p>
    </Modal>
  );
}

// Alert Dialog - for important messages
interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
}

const alertIcons: Record<string, ReactNode> = {
  success: (
    <div className="w-12 h-12 rounded-full bg-accent-green/20 flex items-center justify-center mb-4">
      <svg className="w-6 h-6 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  ),
  error: (
    <div className="w-12 h-12 rounded-full bg-accent-red/20 flex items-center justify-center mb-4">
      <svg className="w-6 h-6 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  ),
  warning: (
    <div className="w-12 h-12 rounded-full bg-accent-amber/20 flex items-center justify-center mb-4">
      <svg className="w-6 h-6 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
  ),
  info: (
    <div className="w-12 h-12 rounded-full bg-accent-blue/20 flex items-center justify-center mb-4">
      <svg className="w-6 h-6 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  ),
};

export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
}: AlertDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      footer={
        <Button variant="primary" onClick={onClose} fullWidth>
          OK
        </Button>
      }
    >
      <div className="text-center">
        {alertIcons[variant]}
        <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    </Modal>
  );
}
