

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, useState } from 'react';
import { Search, X, Eye, EyeOff } from 'lucide-react';

// Size variants
export type InputSize = 'sm' | 'md' | 'lg';

// Base input props
interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  inputSize?: InputSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onClear?: () => void;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
};

const iconPaddingLeft: Record<InputSize, string> = {
  sm: 'pl-8',
  md: 'pl-9',
  lg: 'pl-11',
};

const iconPaddingRight: Record<InputSize, string> = {
  sm: 'pr-8',
  md: 'pr-9',
  lg: 'pr-11',
};

const iconPositionLeft: Record<InputSize, string> = {
  sm: 'left-2.5',
  md: 'left-3',
  lg: 'left-3.5',
};

const iconPositionRight: Record<InputSize, string> = {
  sm: 'right-2.5',
  md: 'right-3',
  lg: 'right-3.5',
};

const iconSize: Record<InputSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  inputSize = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  onClear,
  disabled,
  className = '',
  value,
  ...props
}, ref) => {
  const baseStyles = `
    bg-surface-card border rounded-lg
    text-text-primary
    placeholder:text-text-muted
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue
    disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-hover
  `;
  
  const borderStyle = error ? 'border-accent-red' : 'border-border';
  const sizeStyle = sizeStyles[inputSize];
  const widthStyle = fullWidth ? 'w-full' : '';
  
  // Adjust padding for icons
  let paddingStyles = '';
  if (leftIcon) paddingStyles += ` ${iconPaddingLeft[inputSize]}`;
  if (rightIcon || onClear) paddingStyles += ` ${iconPaddingRight[inputSize]}`;

  const showClear = onClear && value && String(value).length > 0;

  return (
    <div className={`${fullWidth ? 'w-full' : 'inline-block'}`}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className={`absolute top-1/2 -translate-y-1/2 ${iconPositionLeft[inputSize]} ${iconSize[inputSize]} text-text-muted pointer-events-none`}>
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          disabled={disabled}
          value={value}
          className={`${baseStyles} ${borderStyle} ${sizeStyle} ${widthStyle} ${paddingStyles} ${className}`}
          {...props}
        />
        {(rightIcon || showClear) && (
          <span className={`absolute top-1/2 -translate-y-1/2 ${iconPositionRight[inputSize]} ${iconSize[inputSize]} text-text-muted`}>
            {showClear ? (
              <button 
                type="button" 
                onClick={onClear}
                className="p-0.5 hover:text-text-primary transition-colors"
                tabIndex={-1}
              >
                <X className="w-full h-full" />
              </button>
            ) : rightIcon}
          </span>
        )}
      </div>
      {hint && !error && (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-accent-red">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Search Input - specialized for search fields
interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rightIcon'> {
  onSearch?: (value: string) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  inputSize = 'md',
  placeholder = 'Search...',
  onClear,
  onSearch,
  ...props
}, ref) => {
  return (
    <Input
      ref={ref}
      type="text"
      inputSize={inputSize}
      placeholder={placeholder}
      leftIcon={<Search className="w-full h-full" />}
      onClear={onClear}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onSearch) {
          onSearch((e.target as HTMLInputElement).value);
        }
      }}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

// Password Input - with show/hide toggle
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'rightIcon'>>(({
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <Input
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      rightIcon={
        <button 
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="p-0.5 hover:text-text-primary transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-full h-full" />
          ) : (
            <Eye className="w-full h-full" />
          )}
        </button>
      }
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';

// Textarea
interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  inputSize?: InputSize;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const resizeStyles: Record<string, string> = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  hint,
  inputSize = 'md',
  fullWidth = false,
  resize = 'vertical',
  disabled,
  className = '',
  ...props
}, ref) => {
  const baseStyles = `
    bg-surface-card border rounded-lg
    text-text-primary
    placeholder:text-text-muted
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue
    disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-hover
    min-h-[80px]
  `;
  
  const borderStyle = error ? 'border-accent-red' : 'border-border';
  const sizeStyle = sizeStyles[inputSize];
  const widthStyle = fullWidth ? 'w-full' : '';
  const resizeStyle = resizeStyles[resize];

  return (
    <div className={`${fullWidth ? 'w-full' : 'inline-block'}`}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${borderStyle} ${sizeStyle} ${widthStyle} ${resizeStyle} ${className}`}
        {...props}
      />
      {hint && !error && (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-accent-red">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

// Form Group - for consistent form layout
interface FormGroupProps {
  children: ReactNode;
  className?: string;
}

export function FormGroup({ children, className = '' }: FormGroupProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
}

// Form Row - for inline form fields
interface FormRowProps {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function FormRow({ children, className = '', columns }: FormRowProps) {
  const gridClass = columns ? `grid grid-cols-${columns} gap-4` : 'flex items-start gap-4';
  return (
    <div className={`${gridClass} ${className}`}>
      {children}
    </div>
  );
}

// Form Section - for grouping related fields with a title
interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function FormSection({ 
  title, 
  description, 
  children, 
  className = '',
  collapsible = false,
  defaultCollapsed = false,
}: FormSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  return (
    <div className={`${className}`}>
      <div 
        className={`mb-4 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <svg 
              className={`w-4 h-4 text-text-muted transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">{title}</h3>
        </div>
        {description && !isCollapsed && (
          <p className="text-sm text-text-muted mt-1 ml-6">{description}</p>
        )}
      </div>
      {!isCollapsed && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Form Field - wrapper for consistent field presentation
interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  labelPosition?: 'top' | 'left';
  labelWidth?: string;
}

export function FormField({ 
  label, 
  htmlFor,
  required = false, 
  error, 
  hint, 
  children, 
  className = '',
  labelPosition = 'top',
  labelWidth = 'w-32',
}: FormFieldProps) {
  if (labelPosition === 'left') {
    return (
      <div className={`flex items-start gap-4 ${className}`}>
        <label 
          htmlFor={htmlFor}
          className={`${labelWidth} flex-shrink-0 text-sm font-medium text-text-secondary pt-2`}
        >
          {label}
          {required && <span className="text-accent-red ml-0.5">*</span>}
        </label>
        <div className="flex-1">
          {children}
          {hint && !error && (
            <p className="mt-1 text-xs text-text-muted">{hint}</p>
          )}
          {error && (
            <p className="mt-1 text-xs text-accent-red flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={className}>
      <label 
        htmlFor={htmlFor}
        className="block text-sm font-medium text-text-secondary mb-1.5"
      >
        {label}
        {required && <span className="text-accent-red ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-accent-red flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// Form Actions - container for form buttons
interface FormActionsProps {
  children: ReactNode;
  align?: 'left' | 'right' | 'center' | 'between';
  className?: string;
  sticky?: boolean;
}

export function FormActions({ 
  children, 
  align = 'right', 
  className = '',
  sticky = false,
}: FormActionsProps) {
  const alignStyles = {
    left: 'justify-start',
    right: 'justify-end',
    center: 'justify-center',
    between: 'justify-between',
  };
  
  const stickyStyles = sticky 
    ? 'sticky bottom-0 bg-surface-elevated border-t border-border py-4 px-6 -mx-6 -mb-6 mt-6' 
    : 'pt-6 mt-2 border-t border-border';
  
  return (
    <div className={`flex items-center gap-3 ${alignStyles[align]} ${stickyStyles} ${className}`}>
      {children}
    </div>
  );
}
