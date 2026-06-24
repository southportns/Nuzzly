// =============================================
// Timeline Module — Timeline First Architecture
// Source of Truth for all product evaluation and recommendation
// =============================================
// Timeline = Source of Truth
// Review = Raw Data
// Outcome = Product Value
// AI = Timeline Consumer

export {
  generateTimelineMetrics,
  getLatestTimelineMetrics,
  getTimelineMetricsSeries,
  backfillTimelineMetrics,
  updateTimelineMetricsToday,
} from "./metrics-engine"

export type { TimelineMetricsDaily, TimelineMetricsResult } from "./metrics-engine"

export {
  calculateLongitudinalScore,
  scoreProductForPetTimeline,
  batchScoreProductsForPet,
  getLongitudinalScores,
} from "./longitudinal-score"

export type { LongitudinalScore, ScoredProductForPet } from "./longitudinal-score"

export {
  buildTimelineContext,
  buildTimelineContextFromDB,
  timelineContextToPrompt,
} from "./context-builder"

export type { TimelineContext, ReviewWithContext } from "./context-builder"

export {
  recommendFoodByOutcome,
  matchOutcomeForPet,
  getOutcomeIntel,
  batchGetOutcomeIntel,
} from "./outcome-recommendation"

export type {
  OutcomeRecommendationInput,
  OutcomeRecommendationOutput,
  OutcomeRecommendationResult,
  OutcomeIntel,
} from "./outcome-recommendation"

// Phase 3.5: Shadow Mode
export {
  calculateScoreComparison,
  backfillScoreComparison,
  getScoreComparisonReport,
  getLatestScoreComparison,
  getTopDeltaProducts,
  getInflatedReviewProducts,
  getUnderratedProducts,
} from "./shadow-scoring"

export type { ScoreComparison, ScoreComparisonResult, ScoreComparisonReport } from "./shadow-scoring"

export {
  runAgentPipelineWithShadow,
  scoreProductTimelineOnly,
} from "./agent-migration"

export type { ShadowRecommendationResult, TimelineEnhancedRecommendation } from "./agent-migration"

// Phase 3.5: Outcome Dataset Builder
export {
  buildOutcomeDataset,
  buildFullOutcomeDataset,
  incrementalOutcomeDataset,
  exportAsJSONL,
  exportAsCSV,
  getDatasetStats,
} from "./outcome-dataset"

export type { OutcomeSample, OutcomeDataset } from "./outcome-dataset"

// Phase 3.5: Observability
export {
  recordShadowEvent,
  getShadowMetrics,
  resetShadowMetrics,
} from "./shadow-observability"

// Phase 3.6: Rollout Control System
export {
  rolloutController,
  RolloutController,
} from "./rollout-controller"

export type { ScoringEngine, RolloutDecision, DecisionPath } from "./rollout-controller"

export {
  executeRollback,
  checkAndAutoRollback,
  getRollbackHistory,
} from "./rollback-system"

export type { RollbackResult, RollbackType, RollbackThresholds } from "./rollback-system"

export {
  getFlag,
  getFlagEnabled,
  updateFlag,
  evaluatePercentageRollout,
  FLAG_KEYS,
} from "./feature-flags"

export type { FeatureFlag, FeatureFlagValue } from "./feature-flags"

// Phase 3.6: Decision Trace Logger
export {
  logDecision,
  flushDecisionTraces,
  queryDecisionTraces,
  getDecisionPathDistribution,
} from "./decision-trace"

export type { DecisionTraceEntry } from "./decision-trace"

// Phase 3.7: Decision Replay + Causal Debug System
export {
  executeReplay,
  getReplayResult,
} from "./decision-replay"

export type { ReplayInput, ReplayResult, ReplayJobRecord, ReplayStep } from "./decision-replay"
export type { FidelityLevel, FidelityAssessment } from "./decision-replay"

export {
  reconstructPipeline,
} from "./pipeline-reconstructor"

export type { PipelineReconstruction, TraceNode } from "./pipeline-reconstructor"

export {
  computeDiff,
} from "./score-diff"

export type { DiffResult, DiffInput, ProductScoreDiff } from "./score-diff"

export {
  performCausalAnalysis,
} from "./causal-analysis"

export type { CausalAnalysisInput, CausalAnalysisResult, CausalHypothesis } from "./causal-analysis"
export type { BootstrapResult, ConfounderResult, ConfounderType } from "./causal-analysis"

export {
  analyzeRollbackRootCause,
} from "./rollback-root-cause"

export type { RollbackRootCauseResult, RootCauseCandidate, RootCauseInput } from "./rollback-root-cause"

// Phase 3.8: Self-Optimizing Ranking System (Bandit + Adaptive Learning)
export {
  isBanditEnabled,
  listActiveArms,
  getBanditState,
  selectBanditArm,
  recordBanditReward,
} from "./bandit-policy"

export type { BanditArm, BanditStateSnapshot, ArmSelection, SegmentKey } from "./bandit-policy"

export {
  computeReward,
  computeRewardFromAggregates,
  inferSegment,
  normalizeDwellTime,
  timeDecay,
  segmentMultiplier,
  combineWithDelayedProxy,
  DEFAULT_REWARD_WEIGHTS,
  TIME_DECAY_HALF_LIFE_DAYS,
} from "./reward-function"

export type { RewardInput, RewardWeights, EngagementSignals } from "./reward-function"

export {
  proposeWeightAdjustments,
  applyWeightAdjustments,
  runAdaptiveOptimization,
  DEFAULT_OPTIMIZER_CONFIG,
} from "./adaptive-optimizer"

export type { OptimizerConfig, WeightProposition, ApplyResult } from "./adaptive-optimizer"

export {
  isBanditPaused,
  getLastSafetyTrigger,
  loadSafetyThresholds,
  checkGuardrails,
  pauseExploration,
  resumeExploration,
  triggerSafetyRollback,
  runSafetyCheck,
  onCausalAnomalyDetected,
  DEFAULT_SAFETY_THRESHOLDS,
} from "./exploration-safety"

export type { SafetyThresholds, ArmPerformance, GuardrailCheck, SafetyCheckResult } from "./exploration-safety"

export {
  runNearlineLoop,
  runOfflineLoop,
  DEFAULT_NEARLINE_CONFIG,
} from "./learning-loop"

export type { NearlineLoopConfig, NearlineAggregation, OfflineLoopInput, OfflineLoopResult } from "./learning-loop"

export {
  evaluateCounterfactuals,
  compareArms,
} from "./counterfactual-eval"

export type { CounterfactualInput, CounterfactualResult, ArmCounterfactual } from "./counterfactual-eval"

export {
  listStrategies,
  getStrategy,
  getActiveStrategiesForArm,
  createStrategy,
  setStrategyStatus,
  rollbackToStrategy,
  getStrategyPerformance,
  getStrategySummary,
  resolveEligibleStrategies,
} from "./strategy-registry"

export type {
  StrategyRecord,
  StrategyPerformanceRow,
  StrategyStatus,
  CreateStrategyInput,
} from "./strategy-registry"

export {
  recordBanditEvent,
  getBanditMetrics,
  resetBanditMetrics,
} from "./bandit-observability"

export type { BanditEvent, BanditEventType, BanditMetricsSnapshot } from "./bandit-observability"

// Phase 3.8.1: Bandit Hardening Additions
export {
  addDelayedRewardEvent,
  computeDelayedRewardProxy,
  applyDelayedRewards,
  loadDelayedConfig,
  DEFAULT_DELAYED_CONFIG,
} from "./delayed-reward-proxy"

export type {
  DelayedEventType,
  DelayedRewardConfig,
  DelayedProxyComponents,
  DelayedProxyResult,
  DelayedRewardRow,
} from "./delayed-reward-proxy"

export {
  recordArmExposure,
  identifyForcedExplorationArms,
  loadForcedConfig,
  DEFAULT_FORCED_CONFIG,
} from "./forced-exploration"

export type {
  ForcedExplorationConfig,
  ArmExposureStats,
  ExposureSummary,
} from "./forced-exploration"

export {
  computeIntendedPropensities,
  computeObservedPropensities,
  buildCalibrationSnapshot,
  getCalibrationRatio,
  calibratePropensityScore,
  loadCalibrationConfig,
  DEFAULT_CALIBRATION_CONFIG,
} from "./propensity-calibration"

export type {
  PropensityCalibrationConfig,
  ArmCalibration,
  CalibrationSnapshot,
} from "./propensity-calibration"

// Phase 3.9: Global Policy Intelligence Layer (Multi-objective + Cross-segment + Strategy Synthesis)
export {
  normalizeValue,
  normalizeObjectives,
  computeCompositeScore,
  computeParetoFrontier,
  adjustWeightsForContext,
  normalizeWeights,
  evaluateMultiObjective,
  saveObjectiveWeights,
  loadObjectiveWeights,
  DEFAULT_OBJECTIVE_WEIGHTS,
} from "./multi-objective"

export type {
  ObjectiveKey,
  ObjectiveWeights,
  ObjectiveScore,
  MultiObjectiveResult,
  ParetoPoint,
} from "./multi-objective"

export {
  listSegmentPolicies,
  getSegmentPolicy,
  computeSegmentAdjustment,
  computeAllSegmentAdjustments,
  updateSegmentPolicy,
} from "./cross-segment-policy"

export type {
  SegmentPolicy,
  SegmentPolicyAdjustment,
} from "./cross-segment-policy"

export {
  mutateStrategy,
  crossoverStrategies,
  findHistoricalBest,
  identifyPruneCandidates,
  logSynthesis,
  generateSynthesisCandidates,
} from "./strategy-synthesis"

export type {
  SynthesisMethod,
  SynthesisCandidate,
  SynthesisResult,
} from "./strategy-synthesis"

export {
  loadHardConstraints,
  loadSoftConstraints,
  checkLatency,
  checkRollbackSafety,
  checkMinQuality,
  checkDiversity,
  checkFairness,
  checkExplorationCap,
  preExecutionGate,
  getUnresolvedViolations,
  DEFAULT_HARD_CONSTRAINTS,
  DEFAULT_SOFT_CONSTRAINTS,
} from "./global-constraints"

export type {
  ViolationType,
  ViolationSeverity,
  HardConstraints,
  SoftConstraints,
  ConstraintCheckResult,
  ConstraintViolation,
} from "./global-constraints"

export {
  computeGlobalPolicy,
  activatePolicy,
  getActivePolicy,
  getPolicyHistory,
  listPolicyConfigs,
} from "./global-policy-orchestrator"

export type {
  GlobalPolicyConfig,
  PolicyComputeResult,
} from "./global-policy-orchestrator"

export {
  runSimulation,
  getSimulationResults,
} from "./policy-simulator"

export type {
  SimulationInput,
  SegmentSimulationResult,
  SystemUlift,
  SimulationResult,
} from "./policy-simulator"

export {
  recordGlobalPolicyEvent,
  getGlobalPolicyMetrics,
  resetGlobalPolicyMetrics,
} from "./global-policy-observability"

// Phase 3.95: Data Flywheel & Intelligence Validation Layer
export {
  computeAttribution,
  estimateConfidence,
  estimateSuccessProbability,
  saveAttribution,
  getAttributionForRecommendation,
  getAttributionStats,
  OUTCOME_WINDOWS,
} from "./outcome-attribution"

export type {
  OutcomeWindowDays,
  ContributionBreakdown,
  AttributionResult,
  AttributionInput,
} from "./outcome-attribution"

export {
  saveLongitudinalRecord,
  getLongitudinalRecords,
  getLongitudinalStats,
  classifyOutcome,
  HORIZON_DAYS,
} from "./longitudinal-tracking"

export type {
  HorizonDays,
  OutcomeClass,
  LongitudinalRecord,
  LongitudinalInput,
} from "./longitudinal-tracking"

export {
  computeBenchmarkStats,
  updateBenchmark,
  getBenchmarks,
  getBenchmarkConfidence,
} from "./health-benchmarks"

export type {
  HealthBenchmark,
  BenchmarkUpdate,
} from "./health-benchmarks"

export {
  computeEffectivenessScore,
  deriveQualityScore,
  deriveAccuracyScore,
  deriveConsistencyScore,
  deriveSafetyScore,
  saveEffectivenessScore,
  getEffectivenessScores,
  getTopEffectiveEntities,
} from "./effectiveness-scoring"

export type {
  EntityType,
  EffectivenessScore,
  EffectivenessInput,
} from "./effectiveness-scoring"

export {
  generateExplanation,
  saveExplainabilityRecord,
  getExplainabilityForRecommendation,
} from "./explainability-engine"

export type {
  ConfidenceLevel,
  EvidenceItem,
  TimelineSignal,
  SimilarCase,
  ExplainabilityRecord,
  ExplainabilityInput,
} from "./explainability-engine"

export {
  computeCohortMetrics,
  compareWithBaseline,
  saveCohortIntelligence,
  getCohortIntelligence,
  compareCohorts,
} from "./cohort-intelligence"

export type {
  CohortIntelligence,
  CohortMetrics,
} from "./cohort-intelligence"

export {
  runFlywheelCycle,
} from "./data-flywheel"

export type {
  FlywheelIteration,
  FlywheelInput,
} from "./data-flywheel"

export {
  recordOutcomeEvent,
  getOutcomeMetrics,
  resetOutcomeMetrics,
} from "./outcome-observability"

export type {
  OutcomeEventType,
  OutcomeEvent,
} from "./outcome-observability"
