import { useEffect, useCallback, useRef } from 'react';
import { WizardState } from './useMediaPlanWizard';

const DRAFT_KEY = 'media_plan_wizard_draft';
const DRAFT_TIMESTAMP_KEY = 'media_plan_wizard_draft_timestamp';

export interface DraftData {
  state: WizardState;
  timestamp: number;
}

export function useWizardDraft(
  state: WizardState,
  setFullState: (state: WizardState) => void,
  isEditing: boolean = false
) {
  const hasLoadedDraft = useRef(false);
  const lastSavedState = useRef<string>('');

  // Check if there's a saved draft
  const checkForDraft = useCallback((): DraftData | null => {
    if (isEditing) return null;
    
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      const savedTimestamp = localStorage.getItem(DRAFT_TIMESTAMP_KEY);
      
      if (savedDraft && savedTimestamp) {
        const state = JSON.parse(savedDraft) as WizardState;
        const timestamp = parseInt(savedTimestamp, 10);
        
        // Only return draft if it has meaningful data
        if (state.planData.name || state.planData.total_budget > 0 || state.subdivisions.length > 0) {
          return { state, timestamp };
        }
      }
    } catch (error) {
      console.error('Error reading draft:', error);
    }
    return null;
  }, [isEditing]);

  // Save current state as draft
  const saveDraft = useCallback((stateToSave: WizardState) => {
    if (isEditing) return;
    
    try {
      const stateString = JSON.stringify(stateToSave);
      
      // Only save if state has changed
      if (stateString !== lastSavedState.current) {
        localStorage.setItem(DRAFT_KEY, stateString);
        localStorage.setItem(DRAFT_TIMESTAMP_KEY, Date.now().toString());
        lastSavedState.current = stateString;
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [isEditing]);

  // Clear the saved draft
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
      lastSavedState.current = '';
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, []);

  // Load draft into wizard state
  const loadDraft = useCallback((draft: DraftData) => {
    setFullState(draft.state);
    hasLoadedDraft.current = true;
  }, [setFullState]);

  // Auto-save effect - debounced
  useEffect(() => {
    if (isEditing || hasLoadedDraft.current === false) return;
    
    const timeoutId = setTimeout(() => {
      // Only save if there's meaningful data
      if (state.planData.name || state.planData.total_budget > 0 || state.subdivisions.length > 0) {
        saveDraft(state);
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [state, saveDraft, isEditing]);

  // Mark as loaded on first render (to enable auto-save after initial load)
  useEffect(() => {
    hasLoadedDraft.current = true;
  }, []);

  return {
    checkForDraft,
    saveDraft,
    clearDraft,
    loadDraft,
  };
}

export function formatDraftTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'agora mesmo';
  if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
