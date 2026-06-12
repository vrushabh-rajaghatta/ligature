

import { forwardRef, SelectHTMLAttributes, useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// Size variants
export type SelectSize = 'sm' | 'md' | 'lg';

// Standard HTML Select wrapper with proper styling
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  selectSize?: SelectSize;
  fullWidth?: boolean;
  options?: { value: string; label: string }[];
}

const sizeStyles: Record<SelectSize, string> = {
  sm: 'px-3 py-1.5 text-sm pr-8',
  md: 'px-3 py-2 text-sm pr-9',
  lg: 'px-4 py-2.5 text-base pr-10',
};

const iconSizeStyles: Record<SelectSize, string> = {
  sm: 'w-3.5 h-3.5 right-2',
  md: 'w-4 h-4 right-2.5',
  lg: 'w-5 h-5 right-3',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  hint,
  selectSize = 'md',
  fullWidth = false,
  disabled,
  className = '',
  children,
  options,
  ...props
}, ref) => {
  const baseStyles = `
    appearance-none
    bg-surface-card border rounded-lg
    text-text-primary
    placeholder:text-text-muted
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue
    disabled:opacity-50 disabled:cursor-not-allowed
  `;
  
  const borderStyle = error ? 'border-accent-red' : 'border-border';
  const sizeStyle = sizeStyles[selectSize];
  const widthStyle = fullWidth ? 'w-full' : '';
  const iconSize = iconSizeStyles[selectSize];

  return (
    <div className={`${fullWidth ? 'w-full' : 'inline-block'}`}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          disabled={disabled}
          className={`${baseStyles} ${borderStyle} ${sizeStyle} ${widthStyle} ${className}`}
          {...props}
        >
          {options ? options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          )) : children}
        </select>
        <ChevronDown 
          className={`absolute top-1/2 -translate-y-1/2 ${iconSize} text-text-muted pointer-events-none`}
        />
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

Select.displayName = 'Select';

// Custom dropdown with enhanced styling and search
export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  hint?: string;
  size?: SelectSize;
  fullWidth?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  error,
  hint,
  size = 'md',
  fullWidth = false,
  disabled = false,
  searchable = false,
  className = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Filter options based on search
  const filteredOptions = searchable && searchQuery
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const triggerStyles = `
    w-full flex items-center justify-between gap-2
    bg-surface-card border rounded-lg
    text-left
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue
    disabled:opacity-50 disabled:cursor-not-allowed
  `;
  
  const borderStyle = error ? 'border-accent-red' : isOpen ? 'border-accent-blue' : 'border-border';
  const sizeStyle = sizeStyles[size];

  return (
    <div ref={containerRef} className={`relative ${fullWidth ? 'w-full' : 'inline-block min-w-[200px]'} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`${triggerStyles} ${borderStyle} ${sizeStyle}`}
      >
        <span className={`flex-1 truncate ${selectedOption ? 'text-text-primary' : 'text-text-muted'}`}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.icon}
              {selectedOption.label}
            </span>
          ) : placeholder}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-text-muted transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface-elevated border border-border rounded-lg shadow-elevated overflow-hidden">
          {/* Search input */}
          {searchable && (
            <div className="p-2 border-b border-border">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-surface-card border border-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              />
            </div>
          )}
          
          {/* Options list */}
          <div className="max-h-60 overflow-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-text-muted text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-sm text-left
                    transition-colors duration-100
                    ${option.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-surface-card cursor-pointer'
                    }
                    ${option.value === value ? 'bg-surface-card' : ''}
                  `}
                >
                  {option.icon && (
                    <span className="flex-shrink-0 w-4 h-4 text-text-muted">
                      {option.icon}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-text-primary truncate">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-text-muted truncate">{option.description}</div>
                    )}
                  </div>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-accent-blue flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {hint && !error && (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-accent-red">{error}</p>
      )}
    </div>
  );
}

// Filter Select - compact version for filter bars
interface FilterSelectProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterSelect({ label, options, value, onChange, className = '' }: FilterSelectProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-text-muted">{label}</span>
      <Select 
        selectSize="sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </Select>
    </div>
  );
}
