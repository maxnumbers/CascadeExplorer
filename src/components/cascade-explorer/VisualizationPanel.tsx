'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useModelStore } from '@/store/model-store';
import { useDialogueStore } from '@/store/dialogue-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Network,
  List,
  Eye,
  Users,
  Briefcase,
  Code,
  ChevronRight,
  Info,
  Layers,
  GitBranch,
  CheckCircle,
} from 'lucide-react';
import { HypergraphRenderer } from './HypergraphRenderer';
import { PerspectiveAgreementPanel } from './PerspectiveAgreementPanel';
import { DOMAIN_COLORS } from '@/lib/dagre-layout';
import type { SystemConcept, Perspective, ConcernHyperedge } from '@/types/perspectival-model';

// =============================================================================
// PERSPECTIVE SWITCHER
// =============================================================================

const EMPTY_PERSPECTIVES: never[] = [];

function PerspectiveSwitcher() {
  const perspectives = useModelStore((s) => s.model?.perspectives ?? EMPTY_PERSPECTIVES);
  const activePerspectiveId = useModelStore((s) => s.activePerspectiveId);
  const setActivePerspective = useModelStore((s) => s.setActivePerspective);

  const defaultPerspectives = [
    { id: 'all', name: 'All Views', icon: Eye },
  ];

  const displayPerspectives = [
    ...defaultPerspectives,
    ...perspectives.map((p) => ({ ...p, icon: Users })),
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {displayPerspectives.map((perspective) => {
        const Icon = perspective.icon;
        const isActive = activePerspectiveId === perspective.id || (!activePerspectiveId && perspective.id === 'all');

        return (
          <Button
            key={perspective.id}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setActivePerspective(perspective.id === 'all' ? null : perspective.id)}
          >
            <Icon className="h-3 w-3" />
            {perspective.name}
          </Button>
        );
      })}
    </div>
  );
}

// =============================================================================
// MODEL STATS
// =============================================================================

function ModelStats() {
  const model = useModelStore((s) => s.model);

  if (!model) return null;

  return (
    <div className="flex gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <Layers className="h-3 w-3" />
        <span>{model.concepts.length} concepts</span>
      </div>
      <div className="flex items-center gap-1">
        <GitBranch className="h-3 w-3" />
        <span>{model.relationships.length} relationships</span>
      </div>
      <div className="flex items-center gap-1">
        <Eye className="h-3 w-3" />
        <span>{model.perspectives.length} perspectives</span>
      </div>
      <div className="flex items-center gap-1">
        <Users className="h-3 w-3" />
        <span>{model.concerns.length} concerns</span>
      </div>
    </div>
  );
}

// =============================================================================
// CONCEPT LIST VIEW
// =============================================================================

function ConceptListView() {
  const model = useModelStore((s) => s.model);
  const activePerspectiveId = useModelStore((s) => s.activePerspectiveId);

  const filteredConcepts = useMemo(() => {
    if (!model) return [];
    if (!activePerspectiveId) return model.concepts;

    return model.concepts.filter((c) => {
      if (!c.visibleToPerspectives || c.visibleToPerspectives.length === 0) {
        return true;
      }
      return c.visibleToPerspectives.includes(activePerspectiveId);
    });
  }, [model, activePerspectiveId]);

  const conceptsByType = useMemo(() => {
    const grouped: Record<string, SystemConcept[]> = {};
    for (const concept of filteredConcepts) {
      if (!grouped[concept.conceptType]) {
        grouped[concept.conceptType] = [];
      }
      grouped[concept.conceptType].push(concept);
    }
    return grouped;
  }, [filteredConcepts]);

  const typeLabels: Record<string, { label: string; color: string }> = {
    resource: { label: 'Resources', color: 'bg-blue-500' },
    actor: { label: 'Actors', color: 'bg-green-500' },
    artifact: { label: 'Artifacts', color: 'bg-purple-500' },
    process: { label: 'Processes', color: 'bg-orange-500' },
    constraint: { label: 'Constraints', color: 'bg-red-500' },
    goal: { label: 'Goals', color: 'bg-emerald-500' },
    risk: { label: 'Risks', color: 'bg-rose-500' },
    opportunity: { label: 'Opportunities', color: 'bg-cyan-500' },
    metric: { label: 'Metrics', color: 'bg-amber-500' },
    capability: { label: 'Capabilities', color: 'bg-indigo-500' },
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {Object.entries(conceptsByType).map(([type, concepts]) => {
          const config = typeLabels[type] || { label: type, color: 'bg-gray-500' };

          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${config.color}`} />
                <h3 className="font-medium">{config.label}</h3>
                <Badge variant="outline" className="ml-auto">
                  {concepts.length}
                </Badge>
              </div>

              <div className="space-y-2">
                {concepts.map((concept) => (
                  <Card key={concept.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{concept.name}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {concept.description}
                        </p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {concept.abstractionLevel}
                          </Badge>
                          {concept.domains.slice(0, 2).map(d => (
                            <span
                              key={d}
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: `${DOMAIN_COLORS[d]}20`,
                                color: DOMAIN_COLORS[d],
                              }}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// =============================================================================
// CONCERNS (HYPEREDGES) VIEW
// =============================================================================

function ConcernsView() {
  const model = useModelStore((s) => s.model);
  const expandedHyperedges = useModelStore((s) => s.expandedHyperedges);
  const toggleHyperedgeExpansion = useModelStore((s) => s.toggleHyperedgeExpansion);

  if (!model || model.concerns.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No shared concerns identified yet</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {model.concerns.map((concern) => {
          const isExpanded = expandedHyperedges.has(concern.id);
          const conceptNames = concern.connectedConceptIds
            .map(id => model.concepts.find(c => c.id === id)?.name)
            .filter(Boolean);

          return (
            <Card key={concern.id} className="overflow-hidden">
              <div
                className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleHyperedgeExpansion(concern.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: DOMAIN_COLORS[concern.primaryDomain] }}
                      />
                      <h4 className="font-medium text-sm">{concern.concernName}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {concern.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {conceptNames.length} concepts
                  </Badge>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t px-3 py-2 bg-muted/30 space-y-2">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Connected concepts: </span>
                    {conceptNames.join(', ')}
                  </div>
                  {concern.perspectiveWeights.length > 0 && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Perspective weights:</span>
                      <div className="mt-1 space-y-1">
                        {concern.perspectiveWeights.map((pw, idx) => {
                          const perspective = model.perspectives.find(p => p.id === pw.perspectiveId);
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <Badge
                                variant={pw.weight === 'critical' ? 'destructive' : pw.weight === 'important' ? 'default' : 'outline'}
                                className="text-xs"
                              >
                                {pw.weight}
                              </Badge>
                              <span>{perspective?.name || 'Unknown'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VisualizationPanel() {
  const [viewMode, setViewMode] = useState<'graph' | 'list' | 'concerns' | 'agreement'>('graph');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [agreementComplete, setAgreementComplete] = useState(false);

  const model = useModelStore((s) => s.model);
  const phase = useDialogueStore((s) => s.phase);
  const agreedItems = useDialogueStore((s) => s.agreedItems);

  const hasModel = model && (model.concepts.length > 0 || model.concerns.length > 0);

  // Listen for review perspectives event from conversation panel
  useEffect(() => {
    const handleReviewPerspectives = () => {
      setViewMode('agreement');
    };

    window.addEventListener('cascade:review-perspectives', handleReviewPerspectives);
    return () => {
      window.removeEventListener('cascade:review-perspectives', handleReviewPerspectives);
    };
  }, []);

  const handleNodeSelect = (nodeId: string, nodeType: 'concept' | 'hyperedge' | 'perspective') => {
    setSelectedNodeId(nodeId);
  };

  if (phase === 'welcome') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
        <Network className="h-16 w-16 mb-4 opacity-30" />
        <h3 className="text-lg font-medium mb-2">System Model</h3>
        <p className="text-sm max-w-xs">
          Your perspectival system model will appear here as you explore your ideas.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">System Model</h3>
            <ModelStats />
          </div>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="graph" className="text-xs px-2">
                <Network className="h-3 w-3 mr-1" />
                Graph
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs px-2">
                <List className="h-3 w-3 mr-1" />
                Concepts
              </TabsTrigger>
              <TabsTrigger value="concerns" className="text-xs px-2">
                <Users className="h-3 w-3 mr-1" />
                Concerns
              </TabsTrigger>
              <TabsTrigger value="agreement" className="text-xs px-2 relative">
                <CheckCircle className="h-3 w-3 mr-1" />
                Review
                {model?.perspectives.length > 0 && !agreementComplete && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Perspective switcher */}
        <PerspectiveSwitcher />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {hasModel ? (
          viewMode === 'graph' ? (
            <HypergraphRenderer onNodeSelect={handleNodeSelect} />
          ) : viewMode === 'list' ? (
            <ConceptListView />
          ) : viewMode === 'concerns' ? (
            <ConcernsView />
          ) : (
            <div className="p-4 h-full overflow-auto">
              <PerspectiveAgreementPanel
                onComplete={() => {
                  setAgreementComplete(true);
                  setViewMode('graph');
                }}
                onRequestModification={(perspectiveId, feedback) => {
                  console.log('Modification requested:', perspectiveId, feedback);
                  // This would trigger a conversation turn to refine the perspective
                }}
              />
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <Info className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">
              Continue the conversation to generate the system model.
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      {hasModel && viewMode === 'graph' && (
        <div className="p-3 border-t">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-green-500" />
              <span>Positive</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-red-500" />
              <span>Negative</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-gray-500 border-dashed border-t" />
              <span>Variable</span>
            </div>
            <div className="border-l pl-3 flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/50" />
              <span>Hyperedge (concern)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
