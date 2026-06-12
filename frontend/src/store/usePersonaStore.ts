
/**
 * usePersonaStore — v0.44.62 / rebuilt v0.45.2
 * 
 * Zustand store managing the active buyer persona.
 * Persists selection to localStorage so it survives page refreshes.
 * 
 * Used by: HomeScreen (KPI priorities, greeting), PersonaSwitcher,
 * GuidedScenarioOverlay (demo steps), CascadeBanner (emphasis).
 */

import { create } from 'zustand';
import { PERSONAS, DEFAULT_PERSONA_ID, getPersonaById } from '@/config/personas';
import type { PersonaDefinition } from '@/config/personas';

interface PersonaState {
  activePersonaId: string;
  /** Get the full persona definition for the active persona */
  getActivePersona: () => PersonaDefinition;
  /** Switch to a different persona */
  setPersona: (id: string) => void;
  /** Get all available personas */
  getAllPersonas: () => PersonaDefinition[];
  /** Check if a module is in the active persona's primary modules */
  isPersonaPrimaryModule: (moduleId: string) => boolean;
}

// Read initial persona from localStorage (if available)
function getInitialPersonaId(): string {
  if (typeof window === 'undefined') return DEFAULT_PERSONA_ID;
  try {
    const stored = localStorage.getItem('ligature-active-persona');
    if (stored && PERSONAS.some(p => p.id === stored)) return stored;
  } catch {}
  return DEFAULT_PERSONA_ID;
}

export const usePersonaStore = create<PersonaState>((set, get) => ({
  activePersonaId: getInitialPersonaId(),

  getActivePersona: () => {
    const { activePersonaId } = get();
    return getPersonaById(activePersonaId) || getPersonaById(DEFAULT_PERSONA_ID)!;
  },

  setPersona: (id: string) => {
    if (!PERSONAS.some(p => p.id === id)) return;
    set({ activePersonaId: id });
    try {
      localStorage.setItem('ligature-active-persona', id);
    } catch {}
  },

  getAllPersonas: () => PERSONAS,

  isPersonaPrimaryModule: (moduleId: string) => {
    const persona = get().getActivePersona();
    return persona.primaryModules.includes(moduleId);
  },
}));

// Convenience hooks
export function useActivePersona(): PersonaDefinition {
  return usePersonaStore(s => s.getActivePersona());
}

export function usePersonaId(): string {
  return usePersonaStore(s => s.activePersonaId);
}
