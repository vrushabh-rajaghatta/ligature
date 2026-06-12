

// ============================================================================
// USDM Design Matrix Store v0.9.9b - Study Structure Management
// Zustand store for managing Arms, Epochs, Elements, and Cells
// ============================================================================

import { create } from 'zustand';
import { useMemo } from 'react';
import {
  USDMStudyArmEnhanced,
  USDMStudyArmType,
  USDMStudyEpochEnhanced,
  USDMStudyEpochType,
  USDMStudyElementEnhanced,
  USDMStudyCellEnhanced,
  USDMTransitionRuleEnhanced,
  USDMTransitionRuleType,
  USDMDesignMatrixState,
  USDMDesignMatrixActions,
  DesignMatrixView,
  DesignMatrixCell,
  createStudyArmEnhanced,
  createStudyEpochEnhanced,
  createStudyCellEnhanced,
  createStudyElementEnhanced,
  createTransitionRuleEnhanced,
  calculateTotalDuration,
} from './usdm-design-matrix-types';
import { generateUSDMId } from './usdm-core-types';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: USDMDesignMatrixState = {
  armsByDesignId: {},
  epochsByDesignId: {},
  cellsByDesignId: {},
  elementsById: {},
  transitionRulesById: {},
  selectedArmId: null,
  selectedEpochId: null,
  selectedCellId: null,
};

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useUSDMDesignMatrixStore = create<USDMDesignMatrixState & USDMDesignMatrixActions>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // ARMS
  // ==========================================================================

  addStudyArm: (studyDesignId, armData) => {
    const existingArms = get().armsByDesignId[studyDesignId] || [];
    const displayOrder = armData.displayOrder ?? existingArms.length;
    
    const arm = createStudyArmEnhanced(
      armData.studyArmName || 'New Arm',
      armData.studyArmType || 'Experimental',
      displayOrder,
      armData
    );
    
    set((state) => ({
      armsByDesignId: {
        ...state.armsByDesignId,
        [studyDesignId]: [...existingArms, arm],
      },
    }));
    
    // Auto-generate cells for new arm
    const epochs = get().epochsByDesignId[studyDesignId] || [];
    epochs.forEach((epoch) => {
      const existingCell = get().getStudyCell(studyDesignId, arm.id, epoch.id);
      if (!existingCell) {
        get().createStudyCell(studyDesignId, arm.id, epoch.id);
      }
    });
    
    return arm;
  },

  updateStudyArm: (armId, updates) => {
    set((state) => {
      const newArmsByDesignId = { ...state.armsByDesignId };
      
      for (const designId of Object.keys(newArmsByDesignId)) {
        const arms = newArmsByDesignId[designId];
        const index = arms.findIndex((a) => a.id === armId);
        
        if (index !== -1) {
          newArmsByDesignId[designId] = [
            ...arms.slice(0, index),
            { ...arms[index], ...updates, updatedAt: new Date().toISOString() },
            ...arms.slice(index + 1),
          ];
          break;
        }
      }
      
      return { armsByDesignId: newArmsByDesignId };
    });
  },

  removeStudyArm: (armId) => {
    set((state) => {
      const newArmsByDesignId = { ...state.armsByDesignId };
      const newCellsByDesignId = { ...state.cellsByDesignId };
      
      for (const designId of Object.keys(newArmsByDesignId)) {
        const arms = newArmsByDesignId[designId];
        const armIndex = arms.findIndex((a) => a.id === armId);
        
        if (armIndex !== -1) {
          // Remove arm
          newArmsByDesignId[designId] = arms.filter((a) => a.id !== armId);
          
          // Reorder remaining arms
          newArmsByDesignId[designId] = newArmsByDesignId[designId].map((arm, idx) => ({
            ...arm,
            displayOrder: idx,
          }));
          
          // Remove associated cells
          if (newCellsByDesignId[designId]) {
            newCellsByDesignId[designId] = newCellsByDesignId[designId].filter(
              (c) => c.studyArmId !== armId
            );
          }
          
          break;
        }
      }
      
      return {
        armsByDesignId: newArmsByDesignId,
        cellsByDesignId: newCellsByDesignId,
        selectedArmId: state.selectedArmId === armId ? null : state.selectedArmId,
      };
    });
  },

  reorderArms: (studyDesignId, armIds) => {
    set((state) => {
      const arms = state.armsByDesignId[studyDesignId] || [];
      const reorderedArms = armIds
        .map((id, idx) => {
          const arm = arms.find((a) => a.id === id);
          return arm ? { ...arm, displayOrder: idx, updatedAt: new Date().toISOString() } : null;
        })
        .filter(Boolean) as USDMStudyArmEnhanced[];
      
      return {
        armsByDesignId: {
          ...state.armsByDesignId,
          [studyDesignId]: reorderedArms,
        },
      };
    });
  },

  getStudyArms: (studyDesignId) => {
    const arms = get().armsByDesignId[studyDesignId] || [];
    return [...arms].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  // ==========================================================================
  // EPOCHS
  // ==========================================================================

  addStudyEpoch: (studyDesignId, epochData) => {
    const existingEpochs = get().epochsByDesignId[studyDesignId] || [];
    const sequenceNumber = epochData.sequenceNumber ?? existingEpochs.length;
    
    // Get the last epoch to link
    const sortedEpochs = [...existingEpochs].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    const lastEpoch = sortedEpochs[sortedEpochs.length - 1];
    
    const epoch = createStudyEpochEnhanced(
      epochData.studyEpochName || 'New Epoch',
      epochData.studyEpochType || 'Treatment',
      sequenceNumber,
      {
        ...epochData,
        previousStudyEpochId: epochData.previousStudyEpochId || lastEpoch?.id,
      }
    );
    
    // Do all updates in a single set call to maintain consistency
    set((state) => {
      let updatedEpochs = [...(state.epochsByDesignId[studyDesignId] || [])];
      
      // Update the previous epoch's next pointer if needed
      if (lastEpoch && !epochData.previousStudyEpochId) {
        updatedEpochs = updatedEpochs.map((e) =>
          e.id === lastEpoch.id
            ? { ...e, nextStudyEpochId: epoch.id, updatedAt: new Date().toISOString() }
            : e
        );
      }
      
      // Add the new epoch
      updatedEpochs.push(epoch);
      
      return {
        epochsByDesignId: {
          ...state.epochsByDesignId,
          [studyDesignId]: updatedEpochs,
        },
      };
    });
    
    // Auto-generate cells for new epoch
    const arms = get().armsByDesignId[studyDesignId] || [];
    arms.forEach((arm) => {
      const existingCell = get().getStudyCell(studyDesignId, arm.id, epoch.id);
      if (!existingCell) {
        get().createStudyCell(studyDesignId, arm.id, epoch.id);
      }
    });
    
    return epoch;
  },

  updateStudyEpoch: (epochId, updates) => {
    set((state) => {
      const newEpochsByDesignId = { ...state.epochsByDesignId };
      
      for (const designId of Object.keys(newEpochsByDesignId)) {
        const epochs = newEpochsByDesignId[designId];
        const index = epochs.findIndex((e) => e.id === epochId);
        
        if (index !== -1) {
          newEpochsByDesignId[designId] = [
            ...epochs.slice(0, index),
            { ...epochs[index], ...updates, updatedAt: new Date().toISOString() },
            ...epochs.slice(index + 1),
          ];
          break;
        }
      }
      
      return { epochsByDesignId: newEpochsByDesignId };
    });
  },

  removeStudyEpoch: (epochId) => {
    set((state) => {
      const newEpochsByDesignId = { ...state.epochsByDesignId };
      const newCellsByDesignId = { ...state.cellsByDesignId };
      
      for (const designId of Object.keys(newEpochsByDesignId)) {
        const epochs = newEpochsByDesignId[designId];
        const epochIndex = epochs.findIndex((e) => e.id === epochId);
        
        if (epochIndex !== -1) {
          const epochToRemove = epochs[epochIndex];
          
          // Relink the chain
          const prevEpoch = epochs.find((e) => e.nextStudyEpochId === epochId);
          const nextEpoch = epochs.find((e) => e.id === epochToRemove.nextStudyEpochId);
          
          let updatedEpochs = epochs.filter((e) => e.id !== epochId);
          
          if (prevEpoch && nextEpoch) {
            updatedEpochs = updatedEpochs.map((e) =>
              e.id === prevEpoch.id ? { ...e, nextStudyEpochId: nextEpoch.id } : e
            );
          } else if (prevEpoch) {
            updatedEpochs = updatedEpochs.map((e) =>
              e.id === prevEpoch.id ? { ...e, nextStudyEpochId: undefined } : e
            );
          }
          
          // Renumber sequences
          const sortedEpochs = [...updatedEpochs].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
          newEpochsByDesignId[designId] = sortedEpochs.map((e, idx) => ({
            ...e,
            sequenceNumber: idx,
          }));
          
          // Remove associated cells
          if (newCellsByDesignId[designId]) {
            newCellsByDesignId[designId] = newCellsByDesignId[designId].filter(
              (c) => c.studyEpochId !== epochId
            );
          }
          
          break;
        }
      }
      
      return {
        epochsByDesignId: newEpochsByDesignId,
        cellsByDesignId: newCellsByDesignId,
        selectedEpochId: state.selectedEpochId === epochId ? null : state.selectedEpochId,
      };
    });
  },

  reorderEpochs: (studyDesignId, epochIds) => {
    set((state) => {
      const epochs = state.epochsByDesignId[studyDesignId] || [];
      const reorderedEpochs = epochIds
        .map((id, idx) => {
          const epoch = epochs.find((e) => e.id === id);
          if (!epoch) return null;
          
          const prevId = idx > 0 ? epochIds[idx - 1] : undefined;
          const nextId = idx < epochIds.length - 1 ? epochIds[idx + 1] : undefined;
          
          return {
            ...epoch,
            sequenceNumber: idx,
            previousStudyEpochId: prevId,
            nextStudyEpochId: nextId,
            updatedAt: new Date().toISOString(),
          };
        })
        .filter(Boolean) as USDMStudyEpochEnhanced[];
      
      return {
        epochsByDesignId: {
          ...state.epochsByDesignId,
          [studyDesignId]: reorderedEpochs,
        },
      };
    });
  },

  getStudyEpochs: (studyDesignId) => {
    const epochs = get().epochsByDesignId[studyDesignId] || [];
    return [...epochs].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  },

  getEpochSequence: (studyDesignId) => {
    return get().getStudyEpochs(studyDesignId);
  },

  // ==========================================================================
  // CELLS
  // ==========================================================================

  createStudyCell: (studyDesignId, armId, epochId) => {
    // Check if cell already exists
    const existingCell = get().getStudyCell(studyDesignId, armId, epochId);
    if (existingCell) {
      return existingCell;
    }
    
    const cell = createStudyCellEnhanced(armId, epochId);
    
    set((state) => ({
      cellsByDesignId: {
        ...state.cellsByDesignId,
        [studyDesignId]: [...(state.cellsByDesignId[studyDesignId] || []), cell],
      },
    }));
    
    return cell;
  },

  updateStudyCell: (cellId, updates) => {
    set((state) => {
      const newCellsByDesignId = { ...state.cellsByDesignId };
      
      for (const designId of Object.keys(newCellsByDesignId)) {
        const cells = newCellsByDesignId[designId];
        const index = cells.findIndex((c) => c.id === cellId);
        
        if (index !== -1) {
          newCellsByDesignId[designId] = [
            ...cells.slice(0, index),
            { ...cells[index], ...updates, updatedAt: new Date().toISOString() },
            ...cells.slice(index + 1),
          ];
          break;
        }
      }
      
      return { cellsByDesignId: newCellsByDesignId };
    });
  },

  getStudyCell: (studyDesignId, armId, epochId) => {
    const cells = get().cellsByDesignId[studyDesignId] || [];
    return cells.find((c) => c.studyArmId === armId && c.studyEpochId === epochId);
  },

  getStudyCells: (studyDesignId) => {
    return get().cellsByDesignId[studyDesignId] || [];
  },

  getCellsForArm: (studyDesignId, armId) => {
    const cells = get().cellsByDesignId[studyDesignId] || [];
    return cells.filter((c) => c.studyArmId === armId);
  },

  getCellsForEpoch: (studyDesignId, epochId) => {
    const cells = get().cellsByDesignId[studyDesignId] || [];
    return cells.filter((c) => c.studyEpochId === epochId);
  },

  // ==========================================================================
  // ELEMENTS
  // ==========================================================================

  addElementToCell: (cellId, elementData) => {
    const element = createStudyElementEnhanced(
      elementData.studyElementName || 'New Element',
      elementData
    );
    
    set((state) => {
      const newCellsByDesignId = { ...state.cellsByDesignId };
      const newElementsById = { ...state.elementsById, [element.id]: element };
      
      for (const designId of Object.keys(newCellsByDesignId)) {
        const cells = newCellsByDesignId[designId];
        const index = cells.findIndex((c) => c.id === cellId);
        
        if (index !== -1) {
          const cell = cells[index];
          newCellsByDesignId[designId] = [
            ...cells.slice(0, index),
            {
              ...cell,
              studyElements: [...cell.studyElements, element],
              updatedAt: new Date().toISOString(),
            },
            ...cells.slice(index + 1),
          ];
          break;
        }
      }
      
      return {
        cellsByDesignId: newCellsByDesignId,
        elementsById: newElementsById,
      };
    });
    
    return element;
  },

  updateElement: (elementId, updates) => {
    set((state) => {
      const newCellsByDesignId = { ...state.cellsByDesignId };
      const existingElement = state.elementsById[elementId];
      
      if (!existingElement) return state;
      
      const updatedElement = { ...existingElement, ...updates, updatedAt: new Date().toISOString() };
      
      for (const designId of Object.keys(newCellsByDesignId)) {
        newCellsByDesignId[designId] = newCellsByDesignId[designId].map((cell) => ({
          ...cell,
          studyElements: cell.studyElements.map((e) =>
            e.id === elementId ? updatedElement : e
          ),
        }));
      }
      
      return {
        cellsByDesignId: newCellsByDesignId,
        elementsById: { ...state.elementsById, [elementId]: updatedElement },
      };
    });
  },

  removeElementFromCell: (cellId, elementId) => {
    set((state) => {
      const newCellsByDesignId = { ...state.cellsByDesignId };
      const newElementsById = { ...state.elementsById };
      
      for (const designId of Object.keys(newCellsByDesignId)) {
        const cells = newCellsByDesignId[designId];
        const index = cells.findIndex((c) => c.id === cellId);
        
        if (index !== -1) {
          const cell = cells[index];
          newCellsByDesignId[designId] = [
            ...cells.slice(0, index),
            {
              ...cell,
              studyElements: cell.studyElements.filter((e) => e.id !== elementId),
              updatedAt: new Date().toISOString(),
            },
            ...cells.slice(index + 1),
          ];
          
          delete newElementsById[elementId];
          break;
        }
      }
      
      return {
        cellsByDesignId: newCellsByDesignId,
        elementsById: newElementsById,
      };
    });
  },

  // ==========================================================================
  // TRANSITION RULES
  // ==========================================================================

  createTransitionRule: (ruleData) => {
    const rule = createTransitionRuleEnhanced(
      ruleData.transitionRuleDescription || 'New Rule',
      ruleData.ruleType || 'TimeBased',
      ruleData
    );
    
    set((state) => ({
      transitionRulesById: {
        ...state.transitionRulesById,
        [rule.id]: rule,
      },
    }));
    
    return rule;
  },

  updateTransitionRule: (ruleId, updates) => {
    set((state) => {
      const existingRule = state.transitionRulesById[ruleId];
      if (!existingRule) return state;
      
      return {
        transitionRulesById: {
          ...state.transitionRulesById,
          [ruleId]: { ...existingRule, ...updates },
        },
      };
    });
  },

  // ==========================================================================
  // MATRIX OPERATIONS
  // ==========================================================================

  getDesignMatrix: (studyDesignId) => {
    const arms = get().getStudyArms(studyDesignId);
    const epochs = get().getStudyEpochs(studyDesignId);
    const cells = get().cellsByDesignId[studyDesignId] || [];
    
    // Build matrix
    const matrix: DesignMatrixCell[][] = arms.map((arm, armIndex) =>
      epochs.map((epoch, epochIndex) => {
        const cell = cells.find(
          (c) => c.studyArmId === arm.id && c.studyEpochId === epoch.id
        );
        return {
          cell: cell || null,
          armId: arm.id,
          epochId: epoch.id,
          armIndex,
          epochIndex,
          hasElements: cell ? cell.studyElements.length > 0 : false,
        };
      })
    );
    
    // Calculate totals
    const totalSubjects = arms.reduce((sum, arm) => sum + (arm.plannedSubjectNumber || 0), 0);
    const totalDuration = calculateTotalDuration(epochs);
    
    return {
      studyDesignId,
      arms,
      epochs,
      matrix,
      totalSubjects,
      totalDuration,
    };
  },

  generateCellsForDesign: (studyDesignId) => {
    const arms = get().getStudyArms(studyDesignId);
    const epochs = get().getStudyEpochs(studyDesignId);
    
    arms.forEach((arm) => {
      epochs.forEach((epoch) => {
        const existing = get().getStudyCell(studyDesignId, arm.id, epoch.id);
        if (!existing) {
          get().createStudyCell(studyDesignId, arm.id, epoch.id);
        }
      });
    });
  },

  // ==========================================================================
  // SELECTION
  // ==========================================================================

  setSelectedArm: (armId) => set({ selectedArmId: armId }),
  setSelectedEpoch: (epochId) => set({ selectedEpochId: epochId }),
  setSelectedCell: (cellId) => set({ selectedCellId: cellId }),

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  clearDesignMatrix: (studyDesignId) => {
    set((state) => ({
      armsByDesignId: {
        ...state.armsByDesignId,
        [studyDesignId]: [],
      },
      epochsByDesignId: {
        ...state.epochsByDesignId,
        [studyDesignId]: [],
      },
      cellsByDesignId: {
        ...state.cellsByDesignId,
        [studyDesignId]: [],
      },
      selectedArmId: null,
      selectedEpochId: null,
      selectedCellId: null,
    }));
  },
}));

// ============================================================================
// MOCK DATA LOADER (LIG-2847 Golden Path)
// ============================================================================

export const loadDesignMatrixMockData = (studyDesignId: string): void => {
  const store = useUSDMDesignMatrixStore.getState();
  
  // Clear existing data
  store.clearDesignMatrix(studyDesignId);
  
  // Add Study Arms (typical Phase 3 oncology design)
  const armExperimental = store.addStudyArm(studyDesignId, {
    studyArmName: 'Ligrastinib (LIG-2847)',
    studyArmDescription: 'Ligrastinib 150mg QD plus best supportive care',
    studyArmType: 'Experimental',
    studyArmOriginType: 'Randomized',
    studyArmDataOriginType: 'Collected',
    plannedSubjectNumber: 300,
    randomizationRatio: '2',
  });
  
  const armPlacebo = store.addStudyArm(studyDesignId, {
    studyArmName: 'Placebo',
    studyArmDescription: 'Matching placebo QD plus best supportive care',
    studyArmType: 'PlaceboComparator',
    studyArmOriginType: 'Randomized',
    studyArmDataOriginType: 'Collected',
    plannedSubjectNumber: 150,
    randomizationRatio: '1',
  });
  
  // Add Study Epochs (typical oncology trial timeline)
  const epochScreening = store.addStudyEpoch(studyDesignId, {
    studyEpochName: 'Screening',
    studyEpochDescription: 'Eligibility assessment and baseline evaluations',
    studyEpochType: 'Screening',
    plannedDuration: { value: 28, unit: 'days' },
    allowsEarlyTermination: true,
    entryCriteriaDescription: 'Signed informed consent',
    exitCriteriaDescription: 'All eligibility criteria confirmed',
  });
  
  const epochTreatment = store.addStudyEpoch(studyDesignId, {
    studyEpochName: 'Treatment',
    studyEpochDescription: 'Double-blind treatment period until disease progression or unacceptable toxicity',
    studyEpochType: 'Treatment',
    plannedDuration: { value: 24, unit: 'months' },
    minimumDuration: { value: 1, unit: 'months' },
    allowsEarlyTermination: true,
    entryCriteriaDescription: 'Randomization completed',
    exitCriteriaDescription: 'Disease progression, unacceptable toxicity, or treatment completion',
  });
  
  const epochFollowUp = store.addStudyEpoch(studyDesignId, {
    studyEpochName: 'Survival Follow-Up',
    studyEpochDescription: 'Long-term survival follow-up',
    studyEpochType: 'FollowUp',
    plannedDuration: { value: 36, unit: 'months' },
    allowsEarlyTermination: false,
    entryCriteriaDescription: 'Completed or discontinued treatment',
    exitCriteriaDescription: 'Study completion or death',
  });
  
  // Add elements to cells
  // Experimental arm - Screening
  const cellExpScreening = store.getStudyCell(studyDesignId, armExperimental.id, epochScreening.id);
  if (cellExpScreening) {
    store.addElementToCell(cellExpScreening.id, {
      studyElementName: 'Screening Assessments',
      studyElementDescription: 'Complete baseline assessments including tumor imaging, labs, ECG',
      isOptional: false,
      activityIds: ['act-consent', 'act-demog', 'act-med-hist', 'act-tumor-assess', 'act-labs', 'act-ecg'],
    });
  }
  
  // Experimental arm - Treatment
  const cellExpTreatment = store.getStudyCell(studyDesignId, armExperimental.id, epochTreatment.id);
  if (cellExpTreatment) {
    store.addElementToCell(cellExpTreatment.id, {
      studyElementName: 'Ligrastinib Treatment',
      studyElementDescription: 'Ligrastinib 150mg QD oral administration',
      isOptional: false,
      studyInterventionIds: ['int-ligrastinib'],
      transitionStartRule: createTransitionRuleEnhanced(
        'Start upon randomization',
        'EventBased',
        { eventCondition: 'Randomization complete' }
      ),
      transitionEndRule: createTransitionRuleEnhanced(
        'End upon disease progression or unacceptable toxicity',
        'EventBased',
        { eventCondition: 'Disease progression OR Grade ≥3 adverse event' }
      ),
    });
    
    store.addElementToCell(cellExpTreatment.id, {
      studyElementName: 'Efficacy Assessments',
      studyElementDescription: 'Tumor response assessments per RECIST 1.1',
      isOptional: false,
      activityIds: ['act-tumor-assess-q8w'],
    });
    
    store.addElementToCell(cellExpTreatment.id, {
      studyElementName: 'Safety Monitoring',
      studyElementDescription: 'Ongoing safety assessments',
      isOptional: false,
      activityIds: ['act-ae-collection', 'act-labs-q4w', 'act-ecg-q12w'],
    });
  }
  
  // Experimental arm - Follow-up
  const cellExpFollowUp = store.getStudyCell(studyDesignId, armExperimental.id, epochFollowUp.id);
  if (cellExpFollowUp) {
    store.addElementToCell(cellExpFollowUp.id, {
      studyElementName: 'Survival Follow-Up',
      studyElementDescription: 'Survival status collection every 12 weeks',
      isOptional: false,
      activityIds: ['act-survival-fu'],
    });
  }
  
  // Placebo arm - Screening (same as experimental)
  const cellPlaceboScreening = store.getStudyCell(studyDesignId, armPlacebo.id, epochScreening.id);
  if (cellPlaceboScreening) {
    store.addElementToCell(cellPlaceboScreening.id, {
      studyElementName: 'Screening Assessments',
      studyElementDescription: 'Complete baseline assessments including tumor imaging, labs, ECG',
      isOptional: false,
      activityIds: ['act-consent', 'act-demog', 'act-med-hist', 'act-tumor-assess', 'act-labs', 'act-ecg'],
    });
  }
  
  // Placebo arm - Treatment
  const cellPlaceboTreatment = store.getStudyCell(studyDesignId, armPlacebo.id, epochTreatment.id);
  if (cellPlaceboTreatment) {
    store.addElementToCell(cellPlaceboTreatment.id, {
      studyElementName: 'Placebo Treatment',
      studyElementDescription: 'Matching placebo QD oral administration',
      isOptional: false,
      studyInterventionIds: ['int-placebo'],
      transitionStartRule: createTransitionRuleEnhanced(
        'Start upon randomization',
        'EventBased',
        { eventCondition: 'Randomization complete' }
      ),
      transitionEndRule: createTransitionRuleEnhanced(
        'End upon disease progression or unacceptable toxicity',
        'EventBased',
        { eventCondition: 'Disease progression OR Grade ≥3 adverse event' }
      ),
    });
    
    store.addElementToCell(cellPlaceboTreatment.id, {
      studyElementName: 'Efficacy Assessments',
      studyElementDescription: 'Tumor response assessments per RECIST 1.1',
      isOptional: false,
      activityIds: ['act-tumor-assess-q8w'],
    });
    
    store.addElementToCell(cellPlaceboTreatment.id, {
      studyElementName: 'Safety Monitoring',
      studyElementDescription: 'Ongoing safety assessments',
      isOptional: false,
      activityIds: ['act-ae-collection', 'act-labs-q4w', 'act-ecg-q12w'],
    });
  }
  
  // Placebo arm - Follow-up
  const cellPlaceboFollowUp = store.getStudyCell(studyDesignId, armPlacebo.id, epochFollowUp.id);
  if (cellPlaceboFollowUp) {
    store.addElementToCell(cellPlaceboFollowUp.id, {
      studyElementName: 'Survival Follow-Up',
      studyElementDescription: 'Survival status collection every 12 weeks',
      isOptional: false,
      activityIds: ['act-survival-fu'],
    });
  }
};

// ============================================================================
// SELECTORS (React Hooks)
// ============================================================================

export const useStudyArms = (studyDesignId: string) => {
  const arms = useUSDMDesignMatrixStore((s) => s.armsByDesignId[studyDesignId] || []);
  return useMemo(() => [...arms].sort((a, b) => a.displayOrder - b.displayOrder), [arms]);
};

export const useStudyEpochs = (studyDesignId: string) => {
  const epochs = useUSDMDesignMatrixStore((s) => s.epochsByDesignId[studyDesignId] || []);
  return useMemo(() => [...epochs].sort((a, b) => a.sequenceNumber - b.sequenceNumber), [epochs]);
};

export const useStudyCells = (studyDesignId: string) => {
  const cells = useUSDMDesignMatrixStore((s) => s.cellsByDesignId[studyDesignId] || []);
  return useMemo(() => cells, [cells]);
};

export const useStudyCell = (studyDesignId: string, armId: string, epochId: string) => {
  const cells = useUSDMDesignMatrixStore((s) => s.cellsByDesignId[studyDesignId] || []);
  return useMemo(
    () => cells.find((c) => c.studyArmId === armId && c.studyEpochId === epochId),
    [cells, armId, epochId]
  );
};

export const useDesignMatrix = (studyDesignId: string): DesignMatrixView => {
  const arms = useStudyArms(studyDesignId);
  const epochs = useStudyEpochs(studyDesignId);
  const cells = useStudyCells(studyDesignId);
  
  return useMemo(() => {
    const matrix: DesignMatrixCell[][] = arms.map((arm, armIndex) =>
      epochs.map((epoch, epochIndex) => {
        const cell = cells.find(
          (c) => c.studyArmId === arm.id && c.studyEpochId === epoch.id
        );
        return {
          cell: cell || null,
          armId: arm.id,
          epochId: epoch.id,
          armIndex,
          epochIndex,
          hasElements: cell ? cell.studyElements.length > 0 : false,
        };
      })
    );
    
    const totalSubjects = arms.reduce((sum, arm) => sum + (arm.plannedSubjectNumber || 0), 0);
    const totalDuration = calculateTotalDuration(epochs);
    
    return {
      studyDesignId,
      arms,
      epochs,
      matrix,
      totalSubjects,
      totalDuration,
    };
  }, [studyDesignId, arms, epochs, cells]);
};

export const useSelectedArm = () => {
  const selectedArmId = useUSDMDesignMatrixStore((s) => s.selectedArmId);
  const armsByDesignId = useUSDMDesignMatrixStore((s) => s.armsByDesignId);
  
  return useMemo(() => {
    if (!selectedArmId) return null;
    for (const arms of Object.values(armsByDesignId)) {
      const found = arms.find((a) => a.id === selectedArmId);
      if (found) return found;
    }
    return null;
  }, [selectedArmId, armsByDesignId]);
};

export const useSelectedEpoch = () => {
  const selectedEpochId = useUSDMDesignMatrixStore((s) => s.selectedEpochId);
  const epochsByDesignId = useUSDMDesignMatrixStore((s) => s.epochsByDesignId);
  
  return useMemo(() => {
    if (!selectedEpochId) return null;
    for (const epochs of Object.values(epochsByDesignId)) {
      const found = epochs.find((e) => e.id === selectedEpochId);
      if (found) return found;
    }
    return null;
  }, [selectedEpochId, epochsByDesignId]);
};

export const useSelectedCell = () => {
  const selectedCellId = useUSDMDesignMatrixStore((s) => s.selectedCellId);
  const cellsByDesignId = useUSDMDesignMatrixStore((s) => s.cellsByDesignId);
  
  return useMemo(() => {
    if (!selectedCellId) return null;
    for (const cells of Object.values(cellsByDesignId)) {
      const found = cells.find((c) => c.id === selectedCellId);
      if (found) return found;
    }
    return null;
  }, [selectedCellId, cellsByDesignId]);
};

// ============================================================================
// CLEAR / RESET
// ============================================================================

export const clearDesignMatrixStore = (): void => {
  useUSDMDesignMatrixStore.setState(initialState);
};
