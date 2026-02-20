// src/components/seo/signal/ImpactPredictor.jsx
// ML-based prediction of CTR/ranking changes before applying
// Connects to Signal API RankingPredictionService for backend predictions
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Target,
  MousePointerClick,
  BarChart3,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { signalSeoApi } from '@/lib/signal-api';
import { useSignalAccess } from '@/lib/signal-access';
import SignalIcon from '@/components/ui/SignalIcon';

// Prediction confidence thresholds
const CONFIDENCE_LEVELS = {
  high: { min: 80, label: 'High Confidence', color: 'text-green-400', bg: 'bg-green-500/20' },
  medium: { min: 60, label: 'Medium Confidence', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  low: { min: 0, label: 'Low Confidence', color: 'text-orange-400', bg: 'bg-orange-500/20' },
};

function getConfidenceLevel(confidence) {
  if (confidence >= CONFIDENCE_LEVELS.high.min) return CONFIDENCE_LEVELS.high;
  if (confidence >= CONFIDENCE_LEVELS.medium.min) return CONFIDENCE_LEVELS.medium;
  return CONFIDENCE_LEVELS.low;
}

// Simple local prediction model based on best practices
function predictImpact(changeType, oldValue, newValue, currentMetrics = {}) {
  const predictions = {
    ctr_change: 0,
    ranking_change: 0,
    impressions_change: 0,
    confidence: 50,
    factors: [],
    warnings: [],
  };

  if (!oldValue || !newValue) return predictions;

  const oldLen = oldValue.length;
  const newLen = newValue.length;

  // Title optimization predictions
  if (changeType === 'title') {
    // Optimal title length: 50-60 characters
    const wasOptimalLength = oldLen >= 50 && oldLen <= 60;
    const isOptimalLength = newLen >= 50 && newLen <= 60;

    if (!wasOptimalLength && isOptimalLength) {
      predictions.ctr_change += 15;
      predictions.factors.push('Title now at optimal length (50-60 chars)');
      predictions.confidence += 20;
    } else if (wasOptimalLength && !isOptimalLength) {
      predictions.ctr_change -= 10;
      predictions.warnings.push('Title moved outside optimal length range');
    }

    // Check for power words
    const powerWords = ['best', 'top', 'guide', 'how to', 'free', 'new', 'proven', 'ultimate', 'complete'];
    const hadPowerWord = powerWords.some(w => oldValue.toLowerCase().includes(w));
    const hasPowerWord = powerWords.some(w => newValue.toLowerCase().includes(w));

    if (!hadPowerWord && hasPowerWord) {
      predictions.ctr_change += 10;
      predictions.factors.push('Added power word for better engagement');
      predictions.confidence += 10;
    }

    // Check for numbers
    const hadNumber = /\d/.test(oldValue);
    const hasNumber = /\d/.test(newValue);

    if (!hadNumber && hasNumber) {
      predictions.ctr_change += 8;
      predictions.factors.push('Added numbers (increases CTR by ~36%)');
      predictions.confidence += 10;
    }

    // Check for year
    const currentYear = new Date().getFullYear();
    const hasYear = newValue.includes(currentYear.toString());
    const hadYear = oldValue.includes(currentYear.toString()) || oldValue.includes((currentYear - 1).toString());

    if (hasYear && !hadYear) {
      predictions.ctr_change += 12;
      predictions.factors.push(`Added current year (${currentYear}) - signals freshness`);
      predictions.confidence += 15;
    }

    // Check for brackets/parentheses
    const hadBrackets = /[\[\(\{]/.test(oldValue);
    const hasBrackets = /[\[\(\{]/.test(newValue);

    if (!hadBrackets && hasBrackets) {
      predictions.ctr_change += 5;
      predictions.factors.push('Added brackets for visual appeal');
      predictions.confidence += 5;
    }
  }

  // Meta description predictions
  if (changeType === 'meta_description') {
    // Optimal length: 150-160 characters
    const wasOptimalLength = oldLen >= 150 && oldLen <= 160;
    const isOptimalLength = newLen >= 150 && newLen <= 160;

    if (!wasOptimalLength && isOptimalLength) {
      predictions.ctr_change += 12;
      predictions.factors.push('Meta description now at optimal length');
      predictions.confidence += 15;
    }

    // Check for call-to-action
    const ctaWords = ['learn', 'discover', 'find out', 'get', 'try', 'start', 'explore', 'see how'];
    const hadCta = ctaWords.some(w => oldValue.toLowerCase().includes(w));
    const hasCta = ctaWords.some(w => newValue.toLowerCase().includes(w));

    if (!hadCta && hasCta) {
      predictions.ctr_change += 8;
      predictions.factors.push('Added call-to-action');
      predictions.confidence += 10;
    }

    // Check if empty to filled
    if (oldLen < 10 && newLen >= 100) {
      predictions.ctr_change += 20;
      predictions.factors.push('Added meta description (was missing)');
      predictions.confidence += 25;
    }
  }

  // H1 predictions
  if (changeType === 'h1') {
    // Keyword alignment can affect rankings
    if (newLen > oldLen && newLen <= 70) {
      predictions.ranking_change += 2;
      predictions.factors.push('Improved H1 for better keyword targeting');
      predictions.confidence += 10;
    }
  }

  // Apply current metrics context
  if (currentMetrics.current_ctr) {
    // Higher current CTR = smaller potential gains
    if (currentMetrics.current_ctr > 5) {
      predictions.ctr_change *= 0.7;
      predictions.factors.push('Already good CTR - marginal gains expected');
    }
  }

  if (currentMetrics.position) {
    // Better position = more impressions impact
    if (currentMetrics.position <= 5) {
      predictions.impressions_change = predictions.ctr_change * 0.8;
    } else if (currentMetrics.position <= 10) {
      predictions.impressions_change = predictions.ctr_change * 0.5;
    }
  }

  // Cap predictions to reasonable ranges
  predictions.ctr_change = Math.min(Math.max(predictions.ctr_change, -50), 100);
  predictions.ranking_change = Math.min(Math.max(predictions.ranking_change, -10), 10);
  predictions.confidence = Math.min(Math.max(predictions.confidence, 20), 95);

  // Add warnings for potential issues
  if (newLen > 60 && changeType === 'title') {
    predictions.warnings.push('Title may be truncated in search results');
  }
  if (newLen > 160 && changeType === 'meta_description') {
    predictions.warnings.push('Meta description may be truncated');
  }

  return predictions;
}

export function ImpactPredictor({
  changeType = 'title',
  oldValue,
  newValue,
  currentMetrics = {},
  compact = false,
  className,
  projectId,
  pageUrl,
  targetKeyword,
  useBackendPrediction = false, // Enable ML prediction from Signal API
}) {
  const { hasAccess: hasSignalAccess } = useSignalAccess();
  const [prediction, setPrediction] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictionSource, setPredictionSource] = useState('local'); // 'local' or 'signal'

  useEffect(() => {
    if (!oldValue && !newValue) {
      setPrediction(null);
      return;
    }

    const fetchPrediction = async () => {
      setLoading(true);
      
      // Try Signal API for ML-based prediction if enabled and has access
      if (useBackendPrediction && hasSignalAccess && projectId) {
        try {
          const mlPrediction = await signalSeoApi.predictRankingImpact(projectId, {
            changeType,
            oldValue,
            newValue,
            pageUrl,
            targetKeyword,
            currentMetrics,
          });
          
          if (mlPrediction) {
            setPrediction({
              ctr_change: mlPrediction.ctr_change || 0,
              ranking_change: mlPrediction.ranking_change || 0,
              impressions_change: mlPrediction.impressions_change || 0,
              confidence: mlPrediction.confidence || 50,
              factors: mlPrediction.factors || [],
              warnings: mlPrediction.warnings || [],
              predicted_position: mlPrediction.predicted_position,
              competitor_analysis: mlPrediction.competitor_analysis,
            });
            setPredictionSource('signal');
            setLoading(false);
            return;
          }
        } catch (error) {
          console.warn('Failed to get ML prediction, falling back to local:', error);
        }
      }
      
      // Fall back to local heuristic prediction
      const result = predictImpact(changeType, oldValue, newValue, currentMetrics);
      setPrediction(result);
      setPredictionSource('local');
      setLoading(false);
    };

    fetchPrediction();
  }, [changeType, oldValue, newValue, currentMetrics, useBackendPrediction, hasSignalAccess, projectId, pageUrl, targetKeyword]);

  if (!prediction && !loading) return null;

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-[var(--text-tertiary)]', className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Predicting impact...</span>
      </div>
    );
  }

  const confidenceLevel = getConfidenceLevel(prediction.confidence);
  const hasPositiveImpact = prediction.ctr_change > 0 || prediction.ranking_change > 0;
  const hasNegativeImpact = prediction.ctr_change < 0 || prediction.ranking_change < 0;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-help',
              hasPositiveImpact ? 'bg-green-500/20 text-green-400' :
              hasNegativeImpact ? 'bg-red-500/20 text-red-400' :
              'bg-[var(--surface-elevated)] text-[var(--text-tertiary)]',
              className
            )}>
              {hasPositiveImpact ? (
                <TrendingUp className="h-3 w-3" />
              ) : hasNegativeImpact ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <BarChart3 className="h-3 w-3" />
              )}
              {prediction.ctr_change > 0 ? '+' : ''}{prediction.ctr_change}% CTR
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">Predicted Impact</p>
              <div className="text-xs space-y-1">
                <p>CTR: {prediction.ctr_change > 0 ? '+' : ''}{prediction.ctr_change}%</p>
                {prediction.ranking_change !== 0 && (
                  <p>Ranking: {prediction.ranking_change > 0 ? '+' : ''}{prediction.ranking_change} positions</p>
                )}
                <p className={confidenceLevel.color}>{confidenceLevel.label}</p>
              </div>
              {prediction.factors.length > 0 && (
                <ul className="text-xs text-[var(--text-tertiary)]">
                  {prediction.factors.map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={cn('border-[var(--glass-border)]', className)}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {predictionSource === 'signal' ? (
              <SignalIcon className="h-4 w-4" color="var(--brand-primary)" />
            ) : (
              <Sparkles className="h-4 w-4 text-[var(--brand-primary)]" />
            )}
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Predicted Impact
            </span>
            <Badge className={cn('text-xs', confidenceLevel.bg, confidenceLevel.color)}>
              {confidenceLevel.label}
            </Badge>
            {predictionSource === 'signal' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] text-[var(--brand-primary)] border-[var(--brand-primary)]/30">
                      <SignalIcon className="h-2.5 w-2.5 mr-0.5" color="var(--brand-primary)" />
                      ML
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Prediction from Signal AI using historical data and competitor analysis
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="h-7 text-xs"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Details
              </>
            )}
          </Button>
        </div>

        {/* Main Predictions */}
        <div className="grid grid-cols-2 gap-4">
          {/* CTR Prediction */}
          <div className={cn(
            'p-3 rounded-lg',
            prediction.ctr_change > 0 ? 'bg-green-500/10' :
            prediction.ctr_change < 0 ? 'bg-red-500/10' :
            'bg-[var(--surface-elevated)]'
          )}>
            <div className="flex items-center gap-2 mb-1">
              <MousePointerClick className="h-4 w-4 text-[var(--text-tertiary)]" />
              <span className="text-xs text-[var(--text-tertiary)]">CTR Change</span>
            </div>
            <div className="flex items-center gap-2">
              {prediction.ctr_change > 0 ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : prediction.ctr_change < 0 ? (
                <TrendingDown className="h-5 w-5 text-red-400" />
              ) : (
                <BarChart3 className="h-5 w-5 text-[var(--text-tertiary)]" />
              )}
              <span className={cn(
                'text-xl font-bold',
                prediction.ctr_change > 0 ? 'text-green-400' :
                prediction.ctr_change < 0 ? 'text-red-400' :
                'text-[var(--text-secondary)]'
              )}>
                {prediction.ctr_change > 0 ? '+' : ''}{prediction.ctr_change}%
              </span>
            </div>
          </div>

          {/* Ranking Prediction */}
          <div className={cn(
            'p-3 rounded-lg',
            prediction.ranking_change > 0 ? 'bg-green-500/10' :
            prediction.ranking_change < 0 ? 'bg-red-500/10' :
            'bg-[var(--surface-elevated)]'
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-[var(--text-tertiary)]" />
              <span className="text-xs text-[var(--text-tertiary)]">Ranking</span>
            </div>
            <div className="flex items-center gap-2">
              {prediction.ranking_change > 0 ? (
                <TrendingUp className="h-5 w-5 text-green-400" />
              ) : prediction.ranking_change < 0 ? (
                <TrendingDown className="h-5 w-5 text-red-400" />
              ) : (
                <BarChart3 className="h-5 w-5 text-[var(--text-tertiary)]" />
              )}
              <span className={cn(
                'text-xl font-bold',
                prediction.ranking_change > 0 ? 'text-green-400' :
                prediction.ranking_change < 0 ? 'text-red-400' :
                'text-[var(--text-secondary)]'
              )}>
                {prediction.ranking_change > 0 ? '+' : ''}{prediction.ranking_change || '—'}
              </span>
              {prediction.ranking_change !== 0 && (
                <span className="text-xs text-[var(--text-tertiary)]">positions</span>
              )}
            </div>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-tertiary)]">Prediction Confidence</span>
            <span className={confidenceLevel.color}>{prediction.confidence}%</span>
          </div>
          <Progress value={prediction.confidence} className="h-1.5" />
        </div>

        {/* Details (expanded) */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-[var(--glass-border)] space-y-3">
                {/* Factors */}
                {prediction.factors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                      <Zap className="h-3 w-3 text-green-400" />
                      Improvement Factors
                    </p>
                    <ul className="space-y-1">
                      {prediction.factors.map((factor, i) => (
                        <li key={i} className="text-xs text-[var(--text-tertiary)] flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">✓</span>
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {prediction.warnings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-yellow-400" />
                      Considerations
                    </p>
                    <ul className="space-y-1">
                      {prediction.warnings.map((warning, i) => (
                        <li key={i} className="text-xs text-yellow-400/80 flex items-start gap-2">
                          <span className="mt-0.5">⚠</span>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-xs text-[var(--text-tertiary)] italic flex items-start gap-1">
                  <Info className="h-3 w-3 shrink-0 mt-0.5" />
                  Predictions based on SEO best practices. Actual results may vary based on competition, search intent, and other factors.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// Hook for easy prediction access
export function useImpactPrediction(changeType, oldValue, newValue, currentMetrics = {}) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!oldValue && !newValue) {
      setPrediction(null);
      return;
    }

    setLoading(true);
    const result = predictImpact(changeType, oldValue, newValue, currentMetrics);
    setPrediction(result);
    setLoading(false);
  }, [changeType, oldValue, newValue, currentMetrics]);

  return { prediction, loading };
}

export default ImpactPredictor;
