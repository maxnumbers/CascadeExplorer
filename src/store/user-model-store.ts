/**
 * @fileOverview User Model Store
 *
 * Manages the user cognitive model for adaptive bias compensation.
 * Learns from conversation to provide requisite variety.
 */

import { create } from 'zustand';
import type {
  UserCognitiveModel,
  BiasCompensationStrategy,
  OptimismPessimism,
  CognitiveBias,
  ExpertiseProfile,
  UserRole,
  InformationPreferences,
} from '@/types/user-model';
import { DEFAULT_USER_MODEL, DEFAULT_COMPENSATION_STRATEGY } from '@/types/user-model';

interface UserModelState {
  // The user cognitive model
  userModel: UserCognitiveModel;

  // Computed compensation strategy
  compensationStrategy: BiasCompensationStrategy;

  // Whether user can see the adaptation
  showAdaptation: boolean;

  // Actions
  updateOptimismPessimism: (update: Partial<OptimismPessimism>) => void;
  addCognitiveBias: (bias: CognitiveBias) => void;
  updateExpertise: (update: Partial<ExpertiseProfile>) => void;
  updateRole: (update: Partial<UserRole>) => void;
  updatePreferences: (update: Partial<InformationPreferences>) => void;

  // Inference from conversation
  addInferenceEvidence: (
    turnId: string,
    dimension: 'optimism' | 'bias' | 'expertise' | 'role',
    signal: {
      interpretation: string;
      weight?: number;
      biasType?: string;
      domain?: string;
    }
  ) => void;

  // Compensation strategy
  recomputeCompensation: () => void;
  overrideCompensation: (override: Partial<BiasCompensationStrategy>) => void;
  resetToDefault: () => void;

  // Visibility
  setShowAdaptation: (show: boolean) => void;
}

function computeCompensationFromModel(model: UserCognitiveModel): BiasCompensationStrategy {
  const strategy: BiasCompensationStrategy = { ...DEFAULT_COMPENSATION_STRATEGY };

  // Adjust for optimism/pessimism
  const { optimismPessimism, cognitiveBiases, expertiseProfile, userRole } = model;

  if (optimismPessimism.confidence > 0.4) {
    // Counter-balance: if user is optimistic, surface more risks
    strategy.riskOpportunityBalance = -optimismPessimism.score * 0.6;

    if (optimismPessimism.score > 0.3) {
      strategy.strategyExplanation =
        "I notice you tend toward optimistic framing. I'm surfacing more risks and challenges to balance your analysis.";
    } else if (optimismPessimism.score < -0.3) {
      strategy.strategyExplanation =
        "I notice you tend toward cautious framing. I'm highlighting more opportunities and positive outcomes to balance your analysis.";
    }
  }

  // Check for confirmation bias
  const confirmationBias = cognitiveBiases.find((b) => b.biasType === 'confirmation_bias');
  if (confirmationBias && confirmationBias.strength !== 'weak') {
    strategy.disconfirmationStrength = confirmationBias.strength === 'strong' ? 0.7 : 0.5;
    strategy.biasCountermeasures.push({
      targetBias: 'confirmation_bias',
      countermeasure: 'Present evidence and scenarios that challenge stated assumptions',
      applicationTrigger: 'When user makes confident assertions',
    });
  }

  // Check for overconfidence
  const overconfidence = cognitiveBiases.find((b) => b.biasType === 'overconfidence');
  if (overconfidence && overconfidence.strength !== 'weak') {
    strategy.uncertaintyAmplification = overconfidence.strength === 'strong' ? 1.5 : 1.2;
  }

  // Highlight blindspot domains
  for (const blindspot of expertiseProfile.blindspotDomains) {
    strategy.blindspotHighlighting.push({
      domain: blindspot.domain,
      highlightStrength: 'moderate',
      reason: `User shows limited awareness of ${blindspot.domain} considerations`,
    });
  }

  // Adjust abstraction based on role
  if (userRole.roleCategory === 'decision_maker') {
    strategy.abstractionAdjustment = {
      direction: 'more_abstract',
      reason: 'User appears to be in decision-maker role, prioritizing strategic view',
    };
  } else if (userRole.roleCategory === 'implementer') {
    strategy.abstractionAdjustment = {
      direction: 'more_concrete',
      reason: 'User appears to be in implementer role, prioritizing actionable detail',
    };
  }

  return strategy;
}

export const useUserModelStore = create<UserModelState>((set, get) => ({
  userModel: { ...DEFAULT_USER_MODEL },
  compensationStrategy: { ...DEFAULT_COMPENSATION_STRATEGY },
  showAdaptation: true,

  updateOptimismPessimism: (update) => {
    set((state) => ({
      userModel: {
        ...state.userModel,
        optimismPessimism: {
          ...state.userModel.optimismPessimism,
          ...update,
        },
      },
    }));
    get().recomputeCompensation();
  },

  addCognitiveBias: (bias) => {
    set((state) => {
      const existing = state.userModel.cognitiveBiases.find(
        (b) => b.biasType === bias.biasType
      );
      if (existing) {
        // Update existing
        return {
          userModel: {
            ...state.userModel,
            cognitiveBiases: state.userModel.cognitiveBiases.map((b) =>
              b.biasType === bias.biasType ? { ...b, ...bias } : b
            ),
          },
        };
      }
      return {
        userModel: {
          ...state.userModel,
          cognitiveBiases: [...state.userModel.cognitiveBiases, bias],
        },
      };
    });
    get().recomputeCompensation();
  },

  updateExpertise: (update) => {
    set((state) => ({
      userModel: {
        ...state.userModel,
        expertiseProfile: {
          ...state.userModel.expertiseProfile,
          ...update,
        },
      },
    }));
    get().recomputeCompensation();
  },

  updateRole: (update) => {
    set((state) => ({
      userModel: {
        ...state.userModel,
        userRole: {
          ...state.userModel.userRole,
          ...update,
        },
      },
    }));
    get().recomputeCompensation();
  },

  updatePreferences: (update) => {
    set((state) => ({
      userModel: {
        ...state.userModel,
        informationPreferences: {
          ...state.userModel.informationPreferences,
          ...update,
        },
      },
    }));
  },

  addInferenceEvidence: (turnId, dimension, signal) => {
    set((state) => {
      const model = { ...state.userModel };

      if (dimension === 'optimism' && signal.weight !== undefined) {
        const current = model.optimismPessimism;
        const newEvidence = {
          turnId,
          quote: signal.interpretation,
          interpretation: signal.interpretation,
          weight: signal.weight,
        };
        const allEvidence = [...current.evidence, newEvidence];

        // Recalculate score as weighted average
        const totalWeight = allEvidence.reduce((sum, e) => sum + Math.abs(e.weight), 0);
        const weightedSum = allEvidence.reduce((sum, e) => sum + e.weight, 0);
        const newScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

        model.optimismPessimism = {
          ...current,
          score: Math.max(-1, Math.min(1, newScore)),
          confidence: Math.min(1, current.confidence + 0.1),
          evidence: allEvidence,
        };
      }

      if (dimension === 'bias' && signal.biasType) {
        const biasType = signal.biasType as CognitiveBias['biasType'];
        const existing = model.cognitiveBiases.find((b) => b.biasType === biasType);
        if (existing) {
          existing.evidence.push({ turnId, indicator: signal.interpretation });
          existing.confidence = Math.min(1, existing.confidence + 0.1);
        } else {
          model.cognitiveBiases.push({
            biasType,
            strength: 'weak',
            confidence: 0.3,
            evidence: [{ turnId, indicator: signal.interpretation }],
            likelyEffects: [],
          });
        }
      }

      if (dimension === 'expertise' && signal.domain) {
        const existing = model.expertiseProfile.expertDomains.find(
          (d) => d.domain === signal.domain
        );
        if (existing) {
          existing.evidence.push(turnId);
        } else {
          model.expertiseProfile.expertDomains.push({
            domain: signal.domain,
            level: 'competent',
            evidence: [turnId],
          });
        }
      }

      model.modelConfidence = {
        ...model.modelConfidence,
        turnsAnalyzed: model.modelConfidence.turnsAnalyzed + 1,
        lastUpdated: new Date().toISOString(),
        overall: Math.min(1, model.modelConfidence.overall + 0.05),
      };

      return { userModel: model };
    });
    get().recomputeCompensation();
  },

  recomputeCompensation: () => {
    const model = get().userModel;
    const strategy = computeCompensationFromModel(model);
    set({ compensationStrategy: strategy });
  },

  overrideCompensation: (override) => {
    set((state) => ({
      compensationStrategy: {
        ...state.compensationStrategy,
        ...override,
      },
    }));
  },

  resetToDefault: () => {
    set({
      userModel: { ...DEFAULT_USER_MODEL },
      compensationStrategy: { ...DEFAULT_COMPENSATION_STRATEGY },
    });
  },

  setShowAdaptation: (show) => set({ showAdaptation: show }),
}));

// Selector hooks
export const useCompensationStrategy = () =>
  useUserModelStore((state) => state.compensationStrategy);
export const useUserBiases = () =>
  useUserModelStore((state) => state.userModel.cognitiveBiases);
export const useOptimismScore = () =>
  useUserModelStore((state) => state.userModel.optimismPessimism.score);
