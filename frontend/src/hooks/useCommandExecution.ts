

/**
 * useCommandExecution - v0.12.4
 * 
 * Hook for executing parsed commands from the command palette.
 * Takes a ParsedCommand and performs the appropriate action:
 * - Navigate to target module
 * - Select specific item if objectId provided
 * - Apply filters if needed
 */

import { useCallback, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ParsedCommand, CommandVerb, CommandObjectType } from '@/data/command-grammar';

export interface CommandExecutionResult {
  success: boolean;
  message?: string;
  navigatedTo?: string;
}

export interface UseCommandExecutionReturn {
  /** Execute a parsed command */
  execute: (command: ParsedCommand) => CommandExecutionResult;
  /** Whether a command is currently executing */
  isExecuting: boolean;
  /** Last execution result */
  lastResult: CommandExecutionResult | null;
}

/**
 * Hook for executing command palette commands
 */
export function useCommandExecution(): UseCommandExecutionReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<CommandExecutionResult | null>(null);
  
  // Get store actions
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const selectHAQ = useAppStore((s) => s.selectHAQ);
  const selectDocument = useAppStore((s) => s.selectDocument);
  const selectSignal = useAppStore((s) => s.selectSignal);
  const selectSubmission = useAppStore((s) => s.selectSubmission);
  
  const execute = useCallback((command: ParsedCommand): CommandExecutionResult => {
    setIsExecuting(true);
    
    try {
      // Navigate to target module
      setActiveModule(command.targetModule);
      
      // Select specific item if ID provided
      if (command.objectId) {
        selectItemByType(command.objectType, command.objectId);
      }
      
      const result: CommandExecutionResult = {
        success: true,
        message: getSuccessMessage(command),
        navigatedTo: command.targetModule,
      };
      
      setLastResult(result);
      return result;
      
    } catch (error) {
      const result: CommandExecutionResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Command execution failed',
      };
      setLastResult(result);
      return result;
      
    } finally {
      setIsExecuting(false);
    }
  }, [setActiveModule, selectHAQ, selectDocument, selectSignal, selectSubmission]);
  
  /**
   * Select an item in the appropriate store based on object type
   */
  function selectItemByType(objectType: CommandObjectType, objectId: string) {
    switch (objectType) {
      case 'haq':
        selectHAQ(objectId);
        break;
      case 'document':
        selectDocument(objectId);
        break;
      case 'signal':
        selectSignal(objectId);
        break;
      case 'submission':
        selectSubmission(objectId);
        break;
      // For sequence, deviation, task - navigation is enough for now
      // The module will handle displaying the appropriate view
      default:
        break;
    }
  }
  
  return {
    execute,
    isExecuting,
    lastResult,
  };
}

/**
 * Generate a human-readable success message for the executed command
 */
function getSuccessMessage(command: ParsedCommand): string {
  const verbMessages: Record<CommandVerb, string> = {
    draft: 'Opening draft editor',
    compare: 'Opening comparison view',
    show: 'Showing',
    find: 'Searching',
    approve: 'Opening for approval',
    submit: 'Opening submission',
  };
  
  const objectLabels: Record<CommandObjectType, string> = {
    haq: 'HAQ',
    document: 'document',
    sequence: 'sequence',
    signal: 'safety signal',
    submission: 'submission',
    deviation: 'deviation',
    task: 'task',
  };
  
  const verbMsg = verbMessages[command.verb] || 'Executing';
  const objLabel = objectLabels[command.objectType] || command.objectType;
  
  if (command.objectId) {
    return `${verbMsg} ${objLabel} ${command.objectId}`;
  }
  
  if (command.objectQuery) {
    return `${verbMsg} ${objLabel}s matching "${command.objectQuery}"`;
  }
  
  return `${verbMsg} ${objLabel}s`;
}

/**
 * Get the display label for a command (for command palette UI)
 */
export function getCommandLabel(command: ParsedCommand): string {
  const verbLabels: Record<CommandVerb, string> = {
    draft: 'Draft',
    compare: 'Compare',
    show: 'Show',
    find: 'Find',
    approve: 'Approve',
    submit: 'Submit',
  };
  
  const objectLabels: Record<CommandObjectType, string> = {
    haq: 'HAQ response',
    document: 'document',
    sequence: 'sequences',
    signal: 'safety signals',
    submission: 'submission',
    deviation: 'deviation',
    task: 'tasks',
  };
  
  const verb = verbLabels[command.verb] || command.verb;
  const obj = objectLabels[command.objectType] || command.objectType;
  
  if (command.objectId) {
    return `${verb} ${obj} ${command.objectId}`;
  }
  
  if (command.parameters?.seq1 && command.parameters?.seq2) {
    return `${verb} ${command.parameters.seq1} vs ${command.parameters.seq2}`;
  }
  
  return `${verb} ${obj}`;
}

/**
 * Get icon name for a command verb
 */
export function getCommandVerbIcon(verb: CommandVerb): string {
  const icons: Record<CommandVerb, string> = {
    draft: 'Wand2',
    compare: 'GitCompare',
    show: 'Eye',
    find: 'Search',
    approve: 'CheckCircle',
    submit: 'Send',
  };
  return icons[verb] || 'Command';
}

export default useCommandExecution;
