/**
 * PersonaSwitcher — v0.44.62 / rebuilt v0.45.2
 * 
 * Compact dropdown in the Header bar. Shows current persona avatar initials
 * + name, opens a 6-persona dropdown on click. Designed for investor demos:
 * click a persona, entire platform reorients.
 */


import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User } from 'lucide-react';
import { usePersonaStore } from '@/store/usePersonaStore';
import type { PersonaDefinition } from '@/config/personas';

export function PersonaSwitcher() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const getActivePersona = usePersonaStore(s => s.getActivePersona);
  const getAllPersonas = usePersonaStore(s => s.getAllPersonas);
  const setPersona = usePersonaStore(s => s.setPersona);
  
  const active = getActivePersona();
  const personas = getAllPersonas();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-card transition-colors"
        title={`${active.firstName} ${active.lastName} — ${active.title}`}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: active.avatarColor }}
        >
          {active.avatarInitials}
        </div>
        <span className="text-sm text-text-secondary hidden lg:inline max-w-[120px] truncate">
          {active.firstName}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-surface-elevated border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/50 bg-surface-card/50">
            <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Switch Persona</p>
            <p className="text-xs text-text-muted mt-0.5">Platform reorients to this buyer's view</p>
          </div>

          {/* Persona list */}
          <div className="py-1 max-h-[400px] overflow-y-auto">
            {personas.map((persona) => (
              <PersonaRow
                key={persona.id}
                persona={persona}
                isActive={persona.id === activePersonaId}
                onSelect={() => {
                  setPersona(persona.id);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PersonaRow({ persona, isActive, onSelect }: { persona: PersonaDefinition; isActive: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
        isActive
          ? 'bg-accent-blue/10 border-l-2 border-accent-blue'
          : 'hover:bg-surface-card border-l-2 border-transparent'
      }`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: persona.avatarColor }}
      >
        {persona.avatarInitials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${isActive ? 'text-accent-blue' : 'text-text-primary'}`}>
            {persona.firstName} {persona.lastName}
          </span>
          {isActive && (
            <span className="text-[10px] bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
              Active
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted truncate">{persona.title}</p>
        <p className="text-[11px] text-text-muted/70 mt-0.5 truncate">{persona.value}</p>
      </div>
    </button>
  );
}
