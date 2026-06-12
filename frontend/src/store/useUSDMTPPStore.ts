

// ============================================================================
// USDM TPP Store v0.9.9f - Target Product Profile, Claims & Strategy
// Zustand store for managing TPP, claims, and competitive differentiation
// ============================================================================

import { create } from 'zustand';
import { useMemo } from 'react';
import {
  USDMTargetProductProfile,
  TPPClaim,
  CompetitiveDifferentiation,
  TargetIndication,
  EvidenceRequirement,
  RegulatoryDesignation,
  USDMTPPState,
  USDMTPPActions,
  TPPView,
  ClaimView,
  TPPStatistics,
  ClaimCategory,
  ClaimPriority,
  EvidenceStatus,
  createTPP,
  createClaim,
  createDifferentiation,
  createIndication,
  createEvidenceRequirement,
  getClaimsByCategory,
  getClaimsByPriority,
  countClaimsByCategory,
  countClaimsByPriority,
  countClaimsByEvidenceStatus,
  calculateClaimEvidenceCompleteness,
  calculateTPPEvidenceCompleteness,
} from './usdm-tpp-types';
import { generateUSDMId } from './usdm-core-types';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: USDMTPPState = {
  tppsByStudyId: {},
  claimsByStudyId: {},
  differentiationsByStudyId: {},
  selectedTPPId: null,
  selectedClaimId: null,
  selectedDifferentiationId: null,
};

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useUSDMTPPStore = create<USDMTPPState & USDMTPPActions>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // TPP CRUD
  // ==========================================================================

  addTPP: (studyId, tppData) => {
    const tpp = createTPP(
      studyId,
      tppData.name || 'New TPP',
      tppData.therapeuticArea || '',
      tppData.positioningStatement || '',
      tppData.targetPopulation || '',
      tppData
    );
    
    set((state) => ({
      tppsByStudyId: {
        ...state.tppsByStudyId,
        [studyId]: [...(state.tppsByStudyId[studyId] || []), tpp],
      },
    }));
    
    return tpp;
  },

  updateTPP: (tppId, updates) => {
    set((state) => {
      const newTPPsByStudyId = { ...state.tppsByStudyId };
      
      for (const studyId of Object.keys(newTPPsByStudyId)) {
        const tpps = newTPPsByStudyId[studyId];
        const index = tpps.findIndex((t) => t.id === tppId);
        
        if (index !== -1) {
          newTPPsByStudyId[studyId] = [
            ...tpps.slice(0, index),
            { ...tpps[index], ...updates, updatedAt: new Date().toISOString() },
            ...tpps.slice(index + 1),
          ];
          break;
        }
      }
      
      return { tppsByStudyId: newTPPsByStudyId };
    });
  },

  removeTPP: (tppId) => {
    set((state) => {
      const newTPPsByStudyId = { ...state.tppsByStudyId };
      const newClaimsByStudyId = { ...state.claimsByStudyId };
      const newDiffsByStudyId = { ...state.differentiationsByStudyId };
      
      for (const studyId of Object.keys(newTPPsByStudyId)) {
        const tpps = newTPPsByStudyId[studyId];
        const index = tpps.findIndex((t) => t.id === tppId);
        
        if (index !== -1) {
          // Remove associated claims
          newClaimsByStudyId[studyId] = (newClaimsByStudyId[studyId] || [])
            .filter((c) => c.tppId !== tppId);
          
          // Remove associated differentiations
          newDiffsByStudyId[studyId] = (newDiffsByStudyId[studyId] || [])
            .filter((d) => d.tppId !== tppId);
          
          // Remove TPP
          newTPPsByStudyId[studyId] = [
            ...tpps.slice(0, index),
            ...tpps.slice(index + 1),
          ];
          break;
        }
      }
      
      return {
        tppsByStudyId: newTPPsByStudyId,
        claimsByStudyId: newClaimsByStudyId,
        differentiationsByStudyId: newDiffsByStudyId,
        selectedTPPId: state.selectedTPPId === tppId ? null : state.selectedTPPId,
      };
    });
  },

  // ==========================================================================
  // CLAIM CRUD
  // ==========================================================================

  addClaim: (studyId, tppId, claimData) => {
    const existingClaims = get().claimsByStudyId[studyId] || [];
    const displayOrder = claimData.displayOrder ?? existingClaims.length;
    
    const claim = createClaim(
      studyId,
      tppId,
      claimData.category || 'Efficacy',
      claimData.claimType || 'SuperiorEfficacy',
      claimData.targetClaimText || '',
      claimData.priority || 'ShouldHave',
      displayOrder,
      claimData
    );
    
    set((state) => {
      // Add claim to claims collection
      const newClaimsByStudyId = {
        ...state.claimsByStudyId,
        [studyId]: [...(state.claimsByStudyId[studyId] || []), claim],
      };
      
      // Update TPP's claimIds
      const newTPPsByStudyId = { ...state.tppsByStudyId };
      const tpps = newTPPsByStudyId[studyId] || [];
      const tppIndex = tpps.findIndex((t) => t.id === tppId);
      
      if (tppIndex !== -1) {
        newTPPsByStudyId[studyId] = [
          ...tpps.slice(0, tppIndex),
          {
            ...tpps[tppIndex],
            claimIds: [...tpps[tppIndex].claimIds, claim.id],
            updatedAt: new Date().toISOString(),
          },
          ...tpps.slice(tppIndex + 1),
        ];
      }
      
      return {
        claimsByStudyId: newClaimsByStudyId,
        tppsByStudyId: newTPPsByStudyId,
      };
    });
    
    return claim;
  },

  updateClaim: (claimId, updates) => {
    set((state) => {
      const newClaimsByStudyId = { ...state.claimsByStudyId };
      
      for (const studyId of Object.keys(newClaimsByStudyId)) {
        const claims = newClaimsByStudyId[studyId];
        const index = claims.findIndex((c) => c.id === claimId);
        
        if (index !== -1) {
          newClaimsByStudyId[studyId] = [
            ...claims.slice(0, index),
            { ...claims[index], ...updates, updatedAt: new Date().toISOString() },
            ...claims.slice(index + 1),
          ];
          break;
        }
      }
      
      return { claimsByStudyId: newClaimsByStudyId };
    });
  },

  removeClaim: (claimId) => {
    set((state) => {
      const newClaimsByStudyId = { ...state.claimsByStudyId };
      const newTPPsByStudyId = { ...state.tppsByStudyId };
      let tppId: string | null = null;
      let studyIdFound: string | null = null;
      
      // Find and remove claim
      for (const studyId of Object.keys(newClaimsByStudyId)) {
        const claims = newClaimsByStudyId[studyId];
        const index = claims.findIndex((c) => c.id === claimId);
        
        if (index !== -1) {
          tppId = claims[index].tppId;
          studyIdFound = studyId;
          newClaimsByStudyId[studyId] = [
            ...claims.slice(0, index),
            ...claims.slice(index + 1),
          ];
          break;
        }
      }
      
      // Update TPP's claimIds
      if (tppId && studyIdFound) {
        const tpps = newTPPsByStudyId[studyIdFound] || [];
        const tppIndex = tpps.findIndex((t) => t.id === tppId);
        
        if (tppIndex !== -1) {
          newTPPsByStudyId[studyIdFound] = [
            ...tpps.slice(0, tppIndex),
            {
              ...tpps[tppIndex],
              claimIds: tpps[tppIndex].claimIds.filter((id) => id !== claimId),
              updatedAt: new Date().toISOString(),
            },
            ...tpps.slice(tppIndex + 1),
          ];
        }
      }
      
      return {
        claimsByStudyId: newClaimsByStudyId,
        tppsByStudyId: newTPPsByStudyId,
        selectedClaimId: state.selectedClaimId === claimId ? null : state.selectedClaimId,
      };
    });
  },

  reorderClaims: (studyId, claimIds) => {
    set((state) => {
      const claims = state.claimsByStudyId[studyId] || [];
      const reorderedClaims = claimIds.map((id, index) => {
        const claim = claims.find((c) => c.id === id);
        if (claim) {
          return { ...claim, displayOrder: index };
        }
        return null;
      }).filter((c): c is TPPClaim => c !== null);
      
      // Add any claims that weren't in the reorder list
      const remainingClaims = claims.filter((c) => !claimIds.includes(c.id));
      
      return {
        claimsByStudyId: {
          ...state.claimsByStudyId,
          [studyId]: [...reorderedClaims, ...remainingClaims],
        },
      };
    });
  },

  linkEndpointToClaim: (claimId, endpointId) => {
    set((state) => {
      const newClaimsByStudyId = { ...state.claimsByStudyId };
      
      for (const studyId of Object.keys(newClaimsByStudyId)) {
        const claims = newClaimsByStudyId[studyId];
        const index = claims.findIndex((c) => c.id === claimId);
        
        if (index !== -1) {
          const claim = claims[index];
          if (!claim.supportingEndpointIds.includes(endpointId)) {
            newClaimsByStudyId[studyId] = [
              ...claims.slice(0, index),
              {
                ...claim,
                supportingEndpointIds: [...claim.supportingEndpointIds, endpointId],
                updatedAt: new Date().toISOString(),
              },
              ...claims.slice(index + 1),
            ];
          }
          break;
        }
      }
      
      return { claimsByStudyId: newClaimsByStudyId };
    });
  },

  unlinkEndpointFromClaim: (claimId, endpointId) => {
    set((state) => {
      const newClaimsByStudyId = { ...state.claimsByStudyId };
      
      for (const studyId of Object.keys(newClaimsByStudyId)) {
        const claims = newClaimsByStudyId[studyId];
        const index = claims.findIndex((c) => c.id === claimId);
        
        if (index !== -1) {
          const claim = claims[index];
          newClaimsByStudyId[studyId] = [
            ...claims.slice(0, index),
            {
              ...claim,
              supportingEndpointIds: claim.supportingEndpointIds.filter((id) => id !== endpointId),
              updatedAt: new Date().toISOString(),
            },
            ...claims.slice(index + 1),
          ];
          break;
        }
      }
      
      return { claimsByStudyId: newClaimsByStudyId };
    });
  },

  // ==========================================================================
  // DIFFERENTIATION CRUD
  // ==========================================================================

  addDifferentiation: (studyId, tppId, diffData) => {
    const existingDiffs = get().differentiationsByStudyId[studyId] || [];
    const displayOrder = diffData.displayOrder ?? existingDiffs.length;
    
    const diff = createDifferentiation(
      studyId,
      tppId,
      diffData.competitorName || '',
      diffData.differentiationType || 'Efficacy',
      diffData.differentiationStatement || '',
      displayOrder,
      diffData
    );
    
    set((state) => {
      // Add differentiation
      const newDiffsByStudyId = {
        ...state.differentiationsByStudyId,
        [studyId]: [...(state.differentiationsByStudyId[studyId] || []), diff],
      };
      
      // Update TPP's differentiationIds
      const newTPPsByStudyId = { ...state.tppsByStudyId };
      const tpps = newTPPsByStudyId[studyId] || [];
      const tppIndex = tpps.findIndex((t) => t.id === tppId);
      
      if (tppIndex !== -1) {
        newTPPsByStudyId[studyId] = [
          ...tpps.slice(0, tppIndex),
          {
            ...tpps[tppIndex],
            differentiationIds: [...tpps[tppIndex].differentiationIds, diff.id],
            updatedAt: new Date().toISOString(),
          },
          ...tpps.slice(tppIndex + 1),
        ];
      }
      
      return {
        differentiationsByStudyId: newDiffsByStudyId,
        tppsByStudyId: newTPPsByStudyId,
      };
    });
    
    return diff;
  },

  updateDifferentiation: (diffId, updates) => {
    set((state) => {
      const newDiffsByStudyId = { ...state.differentiationsByStudyId };
      
      for (const studyId of Object.keys(newDiffsByStudyId)) {
        const diffs = newDiffsByStudyId[studyId];
        const index = diffs.findIndex((d) => d.id === diffId);
        
        if (index !== -1) {
          newDiffsByStudyId[studyId] = [
            ...diffs.slice(0, index),
            { ...diffs[index], ...updates, updatedAt: new Date().toISOString() },
            ...diffs.slice(index + 1),
          ];
          break;
        }
      }
      
      return { differentiationsByStudyId: newDiffsByStudyId };
    });
  },

  removeDifferentiation: (diffId) => {
    set((state) => {
      const newDiffsByStudyId = { ...state.differentiationsByStudyId };
      const newTPPsByStudyId = { ...state.tppsByStudyId };
      let tppId: string | null = null;
      let studyIdFound: string | null = null;
      
      // Find and remove differentiation
      for (const studyId of Object.keys(newDiffsByStudyId)) {
        const diffs = newDiffsByStudyId[studyId];
        const index = diffs.findIndex((d) => d.id === diffId);
        
        if (index !== -1) {
          tppId = diffs[index].tppId;
          studyIdFound = studyId;
          newDiffsByStudyId[studyId] = [
            ...diffs.slice(0, index),
            ...diffs.slice(index + 1),
          ];
          break;
        }
      }
      
      // Update TPP's differentiationIds
      if (tppId && studyIdFound) {
        const tpps = newTPPsByStudyId[studyIdFound] || [];
        const tppIndex = tpps.findIndex((t) => t.id === tppId);
        
        if (tppIndex !== -1) {
          newTPPsByStudyId[studyIdFound] = [
            ...tpps.slice(0, tppIndex),
            {
              ...tpps[tppIndex],
              differentiationIds: tpps[tppIndex].differentiationIds.filter((id) => id !== diffId),
              updatedAt: new Date().toISOString(),
            },
            ...tpps.slice(tppIndex + 1),
          ];
        }
      }
      
      return {
        differentiationsByStudyId: newDiffsByStudyId,
        tppsByStudyId: newTPPsByStudyId,
        selectedDifferentiationId: state.selectedDifferentiationId === diffId ? null : state.selectedDifferentiationId,
      };
    });
  },

  reorderDifferentiations: (studyId, diffIds) => {
    set((state) => {
      const diffs = state.differentiationsByStudyId[studyId] || [];
      const reorderedDiffs = diffIds.map((id, index) => {
        const diff = diffs.find((d) => d.id === id);
        if (diff) {
          return { ...diff, displayOrder: index };
        }
        return null;
      }).filter((d): d is CompetitiveDifferentiation => d !== null);
      
      const remainingDiffs = diffs.filter((d) => !diffIds.includes(d.id));
      
      return {
        differentiationsByStudyId: {
          ...state.differentiationsByStudyId,
          [studyId]: [...reorderedDiffs, ...remainingDiffs],
        },
      };
    });
  },

  // ==========================================================================
  // INDICATION MANAGEMENT
  // ==========================================================================

  addIndication: (tppId, indicationData) => {
    const indication = createIndication(
      indicationData.name || '',
      indicationData.priority || 'Primary',
      indicationData
    );
    
    set((state) => {
      const newTPPsByStudyId = { ...state.tppsByStudyId };
      
      for (const studyId of Object.keys(newTPPsByStudyId)) {
        const tpps = newTPPsByStudyId[studyId];
        const index = tpps.findIndex((t) => t.id === tppId);
        
        if (index !== -1) {
          newTPPsByStudyId[studyId] = [
            ...tpps.slice(0, index),
            {
              ...tpps[index],
              targetIndications: [...tpps[index].targetIndications, indication],
              updatedAt: new Date().toISOString(),
            },
            ...tpps.slice(index + 1),
          ];
          break;
        }
      }
      
      return { tppsByStudyId: newTPPsByStudyId };
    });
  },

  updateIndication: (tppId, indicationId, updates) => {
    set((state) => {
      const newTPPsByStudyId = { ...state.tppsByStudyId };
      
      for (const studyId of Object.keys(newTPPsByStudyId)) {
        const tpps = newTPPsByStudyId[studyId];
        const tppIndex = tpps.findIndex((t) => t.id === tppId);
        
        if (tppIndex !== -1) {
          const tpp = tpps[tppIndex];
          const indIndex = tpp.targetIndications.findIndex((i) => i.id === indicationId);
          
          if (indIndex !== -1) {
            const newIndications = [...tpp.targetIndications];
            newIndications[indIndex] = { ...newIndications[indIndex], ...updates };
            
            newTPPsByStudyId[studyId] = [
              ...tpps.slice(0, tppIndex),
              {
                ...tpp,
                targetIndications: newIndications,
                updatedAt: new Date().toISOString(),
              },
              ...tpps.slice(tppIndex + 1),
            ];
          }
          break;
        }
      }
      
      return { tppsByStudyId: newTPPsByStudyId };
    });
  },

  removeIndication: (tppId, indicationId) => {
    set((state) => {
      const newTPPsByStudyId = { ...state.tppsByStudyId };
      
      for (const studyId of Object.keys(newTPPsByStudyId)) {
        const tpps = newTPPsByStudyId[studyId];
        const index = tpps.findIndex((t) => t.id === tppId);
        
        if (index !== -1) {
          newTPPsByStudyId[studyId] = [
            ...tpps.slice(0, index),
            {
              ...tpps[index],
              targetIndications: tpps[index].targetIndications.filter((i) => i.id !== indicationId),
              updatedAt: new Date().toISOString(),
            },
            ...tpps.slice(index + 1),
          ];
          break;
        }
      }
      
      return { tppsByStudyId: newTPPsByStudyId };
    });
  },

  // ==========================================================================
  // EVIDENCE REQUIREMENT MANAGEMENT
  // ==========================================================================

  addEvidenceRequirement: (claimId, requirementData) => {
    const requirement = createEvidenceRequirement(
      requirementData.description || '',
      requirementData.evidenceType || 'PrimaryEndpoint',
      requirementData.mandatory ?? false,
      requirementData
    );
    
    set((state) => {
      const newClaimsByStudyId = { ...state.claimsByStudyId };
      
      for (const studyId of Object.keys(newClaimsByStudyId)) {
        const claims = newClaimsByStudyId[studyId];
        const index = claims.findIndex((c) => c.id === claimId);
        
        if (index !== -1) {
          newClaimsByStudyId[studyId] = [
            ...claims.slice(0, index),
            {
              ...claims[index],
              evidenceRequirements: [...claims[index].evidenceRequirements, requirement],
              updatedAt: new Date().toISOString(),
            },
            ...claims.slice(index + 1),
          ];
          break;
        }
      }
      
      return { claimsByStudyId: newClaimsByStudyId };
    });
  },

  updateEvidenceRequirement: (claimId, requirementId, updates) => {
    set((state) => {
      const newClaimsByStudyId = { ...state.claimsByStudyId };
      
      for (const studyId of Object.keys(newClaimsByStudyId)) {
        const claims = newClaimsByStudyId[studyId];
        const claimIndex = claims.findIndex((c) => c.id === claimId);
        
        if (claimIndex !== -1) {
          const claim = claims[claimIndex];
          const reqIndex = claim.evidenceRequirements.findIndex((r) => r.id === requirementId);
          
          if (reqIndex !== -1) {
            const newRequirements = [...claim.evidenceRequirements];
            newRequirements[reqIndex] = { ...newRequirements[reqIndex], ...updates };
            
            newClaimsByStudyId[studyId] = [
              ...claims.slice(0, claimIndex),
              {
                ...claim,
                evidenceRequirements: newRequirements,
                updatedAt: new Date().toISOString(),
              },
              ...claims.slice(claimIndex + 1),
            ];
          }
          break;
        }
      }
      
      return { claimsByStudyId: newClaimsByStudyId };
    });
  },

  removeEvidenceRequirement: (claimId, requirementId) => {
    set((state) => {
      const newClaimsByStudyId = { ...state.claimsByStudyId };
      
      for (const studyId of Object.keys(newClaimsByStudyId)) {
        const claims = newClaimsByStudyId[studyId];
        const index = claims.findIndex((c) => c.id === claimId);
        
        if (index !== -1) {
          newClaimsByStudyId[studyId] = [
            ...claims.slice(0, index),
            {
              ...claims[index],
              evidenceRequirements: claims[index].evidenceRequirements.filter((r) => r.id !== requirementId),
              updatedAt: new Date().toISOString(),
            },
            ...claims.slice(index + 1),
          ];
          break;
        }
      }
      
      return { claimsByStudyId: newClaimsByStudyId };
    });
  },

  // ==========================================================================
  // DESIGNATION MANAGEMENT
  // ==========================================================================

  addDesignation: (tppId, designationData) => {
    set((state) => {
      const newTPPsByStudyId = { ...state.tppsByStudyId };
      
      for (const studyId of Object.keys(newTPPsByStudyId)) {
        const tpps = newTPPsByStudyId[studyId];
        const index = tpps.findIndex((t) => t.id === tppId);
        
        if (index !== -1) {
          const tpp = tpps[index];
          const newDesignation: RegulatoryDesignation = {
            designation: designationData.designation || 'BreakthroughTherapy',
            region: designationData.region || 'US',
            status: designationData.status || 'Planned',
            grantDate: designationData.grantDate,
            expirationDate: designationData.expirationDate,
            notes: designationData.notes,
          };
          
          newTPPsByStudyId[studyId] = [
            ...tpps.slice(0, index),
            {
              ...tpp,
              regulatoryStrategy: {
                ...tpp.regulatoryStrategy,
                designations: [...tpp.regulatoryStrategy.designations, newDesignation],
              },
              updatedAt: new Date().toISOString(),
            },
            ...tpps.slice(index + 1),
          ];
          break;
        }
      }
      
      return { tppsByStudyId: newTPPsByStudyId };
    });
  },

  updateDesignation: (tppId, designationIndex, updates) => {
    set((state) => {
      const newTPPsByStudyId = { ...state.tppsByStudyId };
      
      for (const studyId of Object.keys(newTPPsByStudyId)) {
        const tpps = newTPPsByStudyId[studyId];
        const tppIndex = tpps.findIndex((t) => t.id === tppId);
        
        if (tppIndex !== -1) {
          const tpp = tpps[tppIndex];
          const newDesignations = [...tpp.regulatoryStrategy.designations];
          
          if (designationIndex >= 0 && designationIndex < newDesignations.length) {
            newDesignations[designationIndex] = { ...newDesignations[designationIndex], ...updates };
            
            newTPPsByStudyId[studyId] = [
              ...tpps.slice(0, tppIndex),
              {
                ...tpp,
                regulatoryStrategy: {
                  ...tpp.regulatoryStrategy,
                  designations: newDesignations,
                },
                updatedAt: new Date().toISOString(),
              },
              ...tpps.slice(tppIndex + 1),
            ];
          }
          break;
        }
      }
      
      return { tppsByStudyId: newTPPsByStudyId };
    });
  },

  removeDesignation: (tppId, designationIndex) => {
    set((state) => {
      const newTPPsByStudyId = { ...state.tppsByStudyId };
      
      for (const studyId of Object.keys(newTPPsByStudyId)) {
        const tpps = newTPPsByStudyId[studyId];
        const tppIndex = tpps.findIndex((t) => t.id === tppId);
        
        if (tppIndex !== -1) {
          const tpp = tpps[tppIndex];
          const newDesignations = tpp.regulatoryStrategy.designations.filter((_, i) => i !== designationIndex);
          
          newTPPsByStudyId[studyId] = [
            ...tpps.slice(0, tppIndex),
            {
              ...tpp,
              regulatoryStrategy: {
                ...tpp.regulatoryStrategy,
                designations: newDesignations,
              },
              updatedAt: new Date().toISOString(),
            },
            ...tpps.slice(tppIndex + 1),
          ];
          break;
        }
      }
      
      return { tppsByStudyId: newTPPsByStudyId };
    });
  },

  // ==========================================================================
  // VIEWS
  // ==========================================================================

  getTPPView: (studyId) => {
    const state = get();
    const tpps = state.tppsByStudyId[studyId] || [];
    const claims = state.claimsByStudyId[studyId] || [];
    const differentiations = state.differentiationsByStudyId[studyId] || [];
    
    if (tpps.length === 0) {
      return undefined;
    }
    
    // Use the first (typically only) TPP for the study
    const tpp = tpps[0];
    const tppClaims = claims.filter((c) => c.tppId === tpp.id);
    const tppDiffs = differentiations.filter((d) => d.tppId === tpp.id);
    
    const claimViews: ClaimView[] = tppClaims
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((claim) => ({
        claim,
        supportingEndpointCount: claim.supportingEndpointIds.length,
        evidenceCompleteness: calculateClaimEvidenceCompleteness(claim),
      }));
    
    const statistics: TPPStatistics = {
      totalClaims: tppClaims.length,
      claimsByCategory: countClaimsByCategory(tppClaims),
      claimsByPriority: countClaimsByPriority(tppClaims),
      claimsByEvidenceStatus: countClaimsByEvidenceStatus(tppClaims),
      totalDifferentiations: tppDiffs.length,
      designationsCount: tpp.regulatoryStrategy.designations.length,
      targetRegionsCount: tpp.regulatoryStrategy.targetRegions.length,
      evidenceCompleteness: calculateTPPEvidenceCompleteness(tppClaims),
    };
    
    return {
      studyId,
      tpp,
      claims: claimViews,
      differentiations: tppDiffs.sort((a, b) => a.displayOrder - b.displayOrder),
      statistics,
    };
  },

  getClaimsByCategory: (studyId, category) => {
    const claims = get().claimsByStudyId[studyId] || [];
    return getClaimsByCategory(claims, category);
  },

  getClaimsByPriority: (studyId, priority) => {
    const claims = get().claimsByStudyId[studyId] || [];
    return getClaimsByPriority(claims, priority);
  },

  // ==========================================================================
  // SELECTION
  // ==========================================================================

  selectTPP: (tppId) => {
    set({ selectedTPPId: tppId });
  },

  selectClaim: (claimId) => {
    set({ selectedClaimId: claimId });
  },

  selectDifferentiation: (diffId) => {
    set({ selectedDifferentiationId: diffId });
  },

  // ==========================================================================
  // RESET
  // ==========================================================================

  clearTPPStore: () => {
    set(initialState);
  },
}));

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Get all TPPs for a study
 */
export function useTPPs(studyId: string): USDMTargetProductProfile[] {
  const tppsByStudyId = useUSDMTPPStore((state) => state.tppsByStudyId);
  return useMemo(
    () => tppsByStudyId[studyId] || [],
    [tppsByStudyId, studyId]
  );
}

/**
 * Get the primary TPP for a study (first one)
 */
export function usePrimaryTPP(studyId: string): USDMTargetProductProfile | undefined {
  const tpps = useTPPs(studyId);
  return useMemo(() => tpps[0], [tpps]);
}

/**
 * Get all claims for a study
 */
export function useClaims(studyId: string): TPPClaim[] {
  const claimsByStudyId = useUSDMTPPStore((state) => state.claimsByStudyId);
  return useMemo(
    () => (claimsByStudyId[studyId] || []).sort((a, b) => a.displayOrder - b.displayOrder),
    [claimsByStudyId, studyId]
  );
}

/**
 * Get efficacy claims for a study
 */
export function useEfficacyClaims(studyId: string): TPPClaim[] {
  const claims = useClaims(studyId);
  return useMemo(
    () => getClaimsByCategory(claims, 'Efficacy'),
    [claims]
  );
}

/**
 * Get safety claims for a study
 */
export function useSafetyClaims(studyId: string): TPPClaim[] {
  const claims = useClaims(studyId);
  return useMemo(
    () => getClaimsByCategory(claims, 'Safety'),
    [claims]
  );
}

/**
 * Get must-have claims for a study
 */
export function useMustHaveClaims(studyId: string): TPPClaim[] {
  const claims = useClaims(studyId);
  return useMemo(
    () => getClaimsByPriority(claims, 'MustHave'),
    [claims]
  );
}

/**
 * Get all differentiations for a study
 */
export function useDifferentiations(studyId: string): CompetitiveDifferentiation[] {
  const diffsByStudyId = useUSDMTPPStore((state) => state.differentiationsByStudyId);
  return useMemo(
    () => (diffsByStudyId[studyId] || []).sort((a, b) => a.displayOrder - b.displayOrder),
    [diffsByStudyId, studyId]
  );
}

/**
 * Get complete TPP view for a study
 */
export function useTPPView(studyId: string): TPPView | undefined {
  const tppsByStudyId = useUSDMTPPStore((state) => state.tppsByStudyId);
  const claimsByStudyId = useUSDMTPPStore((state) => state.claimsByStudyId);
  const diffsByStudyId = useUSDMTPPStore((state) => state.differentiationsByStudyId);
  
  return useMemo(() => {
    const store = useUSDMTPPStore.getState();
    return store.getTPPView(studyId);
  }, [tppsByStudyId, claimsByStudyId, diffsByStudyId, studyId]);
}

/**
 * Get selected TPP
 */
export function useSelectedTPP(): USDMTargetProductProfile | undefined {
  const selectedTPPId = useUSDMTPPStore((state) => state.selectedTPPId);
  const tppsByStudyId = useUSDMTPPStore((state) => state.tppsByStudyId);
  
  return useMemo(() => {
    if (!selectedTPPId) return undefined;
    
    for (const studyId of Object.keys(tppsByStudyId)) {
      const tpp = tppsByStudyId[studyId].find((t) => t.id === selectedTPPId);
      if (tpp) return tpp;
    }
    return undefined;
  }, [selectedTPPId, tppsByStudyId]);
}

/**
 * Get selected claim
 */
export function useSelectedClaim(): TPPClaim | undefined {
  const selectedClaimId = useUSDMTPPStore((state) => state.selectedClaimId);
  const claimsByStudyId = useUSDMTPPStore((state) => state.claimsByStudyId);
  
  return useMemo(() => {
    if (!selectedClaimId) return undefined;
    
    for (const studyId of Object.keys(claimsByStudyId)) {
      const claim = claimsByStudyId[studyId].find((c) => c.id === selectedClaimId);
      if (claim) return claim;
    }
    return undefined;
  }, [selectedClaimId, claimsByStudyId]);
}

/**
 * Get selected differentiation
 */
export function useSelectedDifferentiation(): CompetitiveDifferentiation | undefined {
  const selectedDiffId = useUSDMTPPStore((state) => state.selectedDifferentiationId);
  const diffsByStudyId = useUSDMTPPStore((state) => state.differentiationsByStudyId);
  
  return useMemo(() => {
    if (!selectedDiffId) return undefined;
    
    for (const studyId of Object.keys(diffsByStudyId)) {
      const diff = diffsByStudyId[studyId].find((d) => d.id === selectedDiffId);
      if (diff) return diff;
    }
    return undefined;
  }, [selectedDiffId, diffsByStudyId]);
}

// ============================================================================
// MOCK DATA LOADER
// ============================================================================
/**
 * Clear TPP store
 */
export function clearTPPStore(): void {
  useUSDMTPPStore.getState().clearTPPStore();
}
