'use client';

import { useState, useMemo } from 'react';
import { useModelStore } from '@/store/model-store';
import { useDialogueStore } from '@/store/dialogue-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Check,
  X,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Users,
  Brain,
  Target,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Perspective } from '@/types/perspectival-model';
import { DOMAIN_COLORS } from '@/lib/dagre-layout';

// =============================================================================
// TYPES
// =============================================================================

interface PerspectiveAgreement {
  perspectiveId: string;
  status: 'pending' | 'agreed' | 'modified' | 'rejected';
  userNote?: string;
  timestamp?: string;
}

interface PerspectiveAgreementPanelProps {
  onComplete?: () => void;
  onRequestModification?: (perspectiveId: string, feedback: string) => void;
}

// =============================================================================
// ARCHETYPE ICONS & LABELS
// =============================================================================

const ARCHETYPE_CONFIG: Record<Perspective['archetype'], {
  icon: typeof Users;
  label: string;
  color: string;
}> = {
  decision_maker: { icon: Briefcase, label: 'Decision Maker', color: 'text-blue-500' },
  implementer: { icon: Brain, label: 'Implementer', color: 'text-purple-500' },
  operator: { icon: Users, label: 'Operator', color: 'text-green-500' },
  beneficiary: { icon: Target, label: 'Beneficiary', color: 'text-amber-500' },
  regulator: { icon: Eye, label: 'Regulator', color: 'text-red-500' },
  competitor: { icon: AlertTriangle, label: 'Competitor', color: 'text-orange-500' },
  partner: { icon: Users, label: 'Partner', color: 'text-cyan-500' },
  observer: { icon: Eye, label: 'Observer', color: 'text-gray-500' },
};

// =============================================================================
// TERMINOLOGY TOOLTIP
// =============================================================================

interface TermTooltipProps {
  term: string;
  definition: string;
  perspectiveView?: string;
}

function TermTooltip({ term, definition, perspectiveView }: TermTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help border-b border-dotted border-muted-foreground/50">
            {term}
            <HelpCircle className="h-3 w-3 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <div className="space-y-2">
            <p className="font-medium">{term}</p>
            <p className="text-xs text-muted-foreground">{definition}</p>
            {perspectiveView && (
              <div className="text-xs mt-2 pt-2 border-t">
                <span className="text-muted-foreground">How this perspective sees it: </span>
                <span>{perspectiveView}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// CONCERN BADGE WITH TOOLTIP
// =============================================================================

interface ConcernBadgeProps {
  concern: string;
  weight?: 'critical' | 'important' | 'minor' | 'invisible';
  reasoning?: string;
}

function ConcernBadge({ concern, weight = 'important', reasoning }: ConcernBadgeProps) {
  const weightConfig = {
    critical: 'bg-red-500/20 text-red-500 border-red-500/30',
    important: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    minor: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
    invisible: 'bg-gray-300/20 text-gray-400 border-gray-300/30',
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn('text-xs cursor-help', weightConfig[weight])}
          >
            {concern}
          </Badge>
        </TooltipTrigger>
        {reasoning && (
          <TooltipContent side="top" className="max-w-xs p-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium capitalize">{weight}</span>
                <span className="text-muted-foreground">priority</span>
              </div>
              <p className="text-xs text-muted-foreground">{reasoning}</p>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// BIAS INDICATOR
// =============================================================================

interface BiasIndicatorProps {
  biases: NonNullable<Perspective['knownBiases']>;
}

function BiasIndicator({ biases }: BiasIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  if (biases.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-dashed">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span>Known biases & blindspots ({biases.length})</span>
            {expanded ? (
              <ChevronDown className="h-3 w-3 ml-auto" />
            ) : (
              <ChevronRight className="h-3 w-3 ml-auto" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {biases.map((bias, idx) => (
            <div key={idx} className="text-xs bg-amber-500/5 rounded p-2">
              <p className="font-medium text-amber-600 dark:text-amber-400">{bias.type}</p>
              <p className="text-muted-foreground mt-1">{bias.description}</p>
              {bias.blindspots.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-muted-foreground">May miss:</span>
                  {bias.blindspots.map((spot, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {spot}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// =============================================================================
// SINGLE PERSPECTIVE CARD
// =============================================================================

interface PerspectiveCardProps {
  perspective: Perspective;
  agreement: PerspectiveAgreement;
  concernWeights: Map<string, { weight: string; reasoning: string }>;
  onAgree: () => void;
  onReject: () => void;
  onRequestModification: () => void;
}

function PerspectiveCard({
  perspective,
  agreement,
  concernWeights,
  onAgree,
  onReject,
  onRequestModification,
}: PerspectiveCardProps) {
  const archetypeConfig = ARCHETYPE_CONFIG[perspective.archetype];
  const Icon = archetypeConfig.icon;
  const isDecided = agreement.status !== 'pending';

  return (
    <Card className={cn(
      'transition-all duration-200',
      agreement.status === 'agreed' && 'ring-2 ring-green-500/30 bg-green-500/5',
      agreement.status === 'rejected' && 'ring-2 ring-red-500/30 bg-red-500/5 opacity-60',
      agreement.status === 'modified' && 'ring-2 ring-amber-500/30 bg-amber-500/5',
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              'bg-muted/50'
            )}>
              <Icon className={cn('h-5 w-5', archetypeConfig.color)} />
            </div>
            <div>
              <CardTitle className="text-base">{perspective.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {archetypeConfig.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {perspective.preferredAbstraction}
                </Badge>
              </div>
            </div>
          </div>

          {isDecided && (
            <div className="flex items-center">
              {agreement.status === 'agreed' && (
                <Badge className="bg-green-500/20 text-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  Agreed
                </Badge>
              )}
              {agreement.status === 'rejected' && (
                <Badge className="bg-red-500/20 text-red-500">
                  <X className="h-3 w-3 mr-1" />
                  Rejected
                </Badge>
              )}
              {agreement.status === 'modified' && (
                <Badge className="bg-amber-500/20 text-amber-500">
                  Modified
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{perspective.description}</p>

        {/* Expertise Domains */}
        <div>
          <p className="text-xs font-medium mb-2">Expertise Domains</p>
          <div className="flex flex-wrap gap-1">
            {perspective.expertiseDomains.map((domain) => (
              <span
                key={domain}
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${DOMAIN_COLORS[domain]}20`,
                  color: DOMAIN_COLORS[domain],
                }}
              >
                {domain}
              </span>
            ))}
          </div>
        </div>

        {/* Concerns with weights */}
        <div>
          <p className="text-xs font-medium mb-2">Key Concerns</p>
          <div className="flex flex-wrap gap-2">
            {perspective.concerns.map((concern) => {
              const weight = concernWeights.get(concern);
              return (
                <ConcernBadge
                  key={concern}
                  concern={concern}
                  weight={weight?.weight as ConcernBadgeProps['weight']}
                  reasoning={weight?.reasoning}
                />
              );
            })}
          </div>
        </div>

        {/* Known biases */}
        {perspective.knownBiases && perspective.knownBiases.length > 0 && (
          <BiasIndicator biases={perspective.knownBiases} />
        )}

        {/* Action buttons */}
        {!isDecided && (
          <div className="flex gap-2 pt-3 border-t">
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={onAgree}
            >
              <Check className="h-4 w-4 mr-1" />
              This makes sense
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onRequestModification}
            >
              Suggest changes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-red-500"
              onClick={onReject}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Reset button for decided perspectives */}
        {isDecided && (
          <div className="flex justify-end pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={onRequestModification}
            >
              Change my response
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PerspectiveAgreementPanel({
  onComplete,
  onRequestModification,
}: PerspectiveAgreementPanelProps) {
  const model = useModelStore((s) => s.model);
  const addAgreement = useDialogueStore((s) => s.addAgreement);

  const [agreements, setAgreements] = useState<Map<string, PerspectiveAgreement>>(
    new Map()
  );
  const [feedbackDialog, setFeedbackDialog] = useState<{
    perspectiveId: string;
    perspectiveName: string;
  } | null>(null);

  const perspectives = model?.perspectives ?? [];
  const concerns = model?.concerns ?? [];

  // Build a map of concern name -> perspective weights
  const perspectiveConcernWeights = useMemo(() => {
    const result = new Map<string, Map<string, { weight: string; reasoning: string }>>();

    for (const perspective of perspectives) {
      const weights = new Map<string, { weight: string; reasoning: string }>();

      for (const concern of concerns) {
        const pw = concern.perspectiveWeights.find(
          (w) => w.perspectiveId === perspective.id
        );
        if (pw) {
          weights.set(concern.concernName, {
            weight: pw.weight,
            reasoning: pw.reasoning,
          });
        }
      }

      result.set(perspective.id, weights);
    }

    return result;
  }, [perspectives, concerns]);

  // Get or create agreement for a perspective
  const getAgreement = (perspectiveId: string): PerspectiveAgreement => {
    return agreements.get(perspectiveId) || {
      perspectiveId,
      status: 'pending',
    };
  };

  const handleAgree = (perspective: Perspective) => {
    const newAgreements = new Map(agreements);
    newAgreements.set(perspective.id, {
      perspectiveId: perspective.id,
      status: 'agreed',
      timestamp: new Date().toISOString(),
    });
    setAgreements(newAgreements);

    // Record in dialogue store
    addAgreement(
      {
        itemId: perspective.id,
        itemType: 'perspective',
        description: `Agreed with perspective: ${perspective.name}`,
        agreementType: 'explicit',
      },
      `perspective-${perspective.id}`
    );

    checkCompletion(newAgreements);
  };

  const handleReject = (perspective: Perspective) => {
    const newAgreements = new Map(agreements);
    newAgreements.set(perspective.id, {
      perspectiveId: perspective.id,
      status: 'rejected',
      timestamp: new Date().toISOString(),
    });
    setAgreements(newAgreements);

    checkCompletion(newAgreements);
  };

  const handleRequestModification = (perspective: Perspective) => {
    setFeedbackDialog({
      perspectiveId: perspective.id,
      perspectiveName: perspective.name,
    });
  };

  const handleSubmitFeedback = (feedback: string) => {
    if (!feedbackDialog) return;

    const newAgreements = new Map(agreements);
    newAgreements.set(feedbackDialog.perspectiveId, {
      perspectiveId: feedbackDialog.perspectiveId,
      status: 'modified',
      userNote: feedback,
      timestamp: new Date().toISOString(),
    });
    setAgreements(newAgreements);

    onRequestModification?.(feedbackDialog.perspectiveId, feedback);
    setFeedbackDialog(null);

    checkCompletion(newAgreements);
  };

  const checkCompletion = (currentAgreements: Map<string, PerspectiveAgreement>) => {
    const allDecided = perspectives.every((p) => {
      const agreement = currentAgreements.get(p.id);
      return agreement && agreement.status !== 'pending';
    });

    if (allDecided) {
      onComplete?.();
    }
  };

  const pendingCount = perspectives.filter(
    (p) => getAgreement(p.id).status === 'pending'
  ).length;

  const agreedCount = perspectives.filter(
    (p) => getAgreement(p.id).status === 'agreed'
  ).length;

  if (perspectives.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>No perspectives have been generated yet.</p>
        <p className="text-sm mt-2">
          Submit an assertion to generate the system model.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Review Perspectives</h3>
          <p className="text-sm text-muted-foreground">
            Do these stakeholder viewpoints make sense for your situation?
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">
            {agreedCount}/{perspectives.length} agreed
          </Badge>
          {pendingCount > 0 && (
            <Badge variant="secondary">
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{
            width: `${((perspectives.length - pendingCount) / perspectives.length) * 100}%`,
          }}
        />
      </div>

      {/* Perspective cards */}
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-4 pr-4">
          {perspectives.map((perspective) => (
            <PerspectiveCard
              key={perspective.id}
              perspective={perspective}
              agreement={getAgreement(perspective.id)}
              concernWeights={perspectiveConcernWeights.get(perspective.id) || new Map()}
              onAgree={() => handleAgree(perspective)}
              onReject={() => handleReject(perspective)}
              onRequestModification={() => handleRequestModification(perspective)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Complete all button */}
      {pendingCount > 0 && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              perspectives.forEach((p) => {
                if (getAgreement(p.id).status === 'pending') {
                  handleAgree(p);
                }
              });
            }}
          >
            Accept all remaining ({pendingCount})
          </Button>
        </div>
      )}

      {/* Feedback dialog (simple inline version) */}
      {feedbackDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <CardTitle className="text-lg">
                Suggest changes to "{feedbackDialog.perspectiveName}"
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className="w-full h-24 p-3 rounded-md border bg-background resize-none"
                placeholder="What should be different about this perspective?"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setFeedbackDialog(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const textarea = document.querySelector('textarea');
                    handleSubmitFeedback(textarea?.value || 'User requested modifications');
                  }}
                >
                  Submit feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
