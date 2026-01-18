'use client';

import { useUserModelStore } from '@/store/user-model-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Eye,
  EyeOff,
  Scale,
} from 'lucide-react';
import { useState } from 'react';

export function AdaptationPanel() {
  const [isOpen, setIsOpen] = useState(true);

  const {
    userModel,
    compensationStrategy,
    showAdaptation,
    overrideCompensation,
    resetToDefault,
    setShowAdaptation,
  } = useUserModelStore();

  const { optimismPessimism, cognitiveBiases, expertiseProfile } = userModel;

  // Calculate a simple profile summary
  const getOptimismLabel = (score: number) => {
    if (score > 0.3) return 'Optimistic';
    if (score < -0.3) return 'Cautious';
    return 'Balanced';
  };

  const handleBalanceChange = (value: number[]) => {
    overrideCompensation({ riskOpportunityBalance: value[0] });
  };

  if (!showAdaptation) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          className="shadow-lg"
          onClick={() => setShowAdaptation(true)}
        >
          <Brain className="h-4 w-4 mr-2" />
          Show Adaptation
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="shadow-xl border-accent/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm">AI Adaptation</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAdaptation(false);
                    }}
                  >
                    <EyeOff className="h-3 w-3" />
                  </Button>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Confidence in model */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Model Confidence</span>
                  <span>{Math.round(userModel.modelConfidence.overall * 100)}%</span>
                </div>
                <Progress value={userModel.modelConfidence.overall * 100} className="h-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {userModel.modelConfidence.turnsAnalyzed} conversation turns
                </p>
              </div>

              {/* Detected profile */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium">Detected Profile</h4>

                {/* Optimism/Pessimism */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {optimismPessimism.score > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : optimismPessimism.score < 0 ? (
                      <TrendingDown className="h-3 w-3 text-orange-500" />
                    ) : (
                      <Scale className="h-3 w-3 text-blue-500" />
                    )}
                    <span className="text-xs">Outlook</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      optimismPessimism.score > 0
                        ? 'text-green-500 border-green-500/30'
                        : optimismPessimism.score < 0
                        ? 'text-orange-500 border-orange-500/30'
                        : ''
                    }
                  >
                    {getOptimismLabel(optimismPessimism.score)}
                  </Badge>
                </div>

                {/* Expertise */}
                {expertiseProfile.expertDomains.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Expertise</span>
                    <div className="flex gap-1">
                      {expertiseProfile.expertDomains.slice(0, 2).map((d) => (
                        <Badge key={d.domain} variant="secondary" className="text-xs">
                          {d.domain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Biases */}
                {cognitiveBiases.length > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-muted-foreground">Potential Biases</span>
                    </div>
                    <span className="text-xs">{cognitiveBiases.length} detected</span>
                  </div>
                )}
              </div>

              {/* Compensation strategy */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium">Response Balance</h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>More Risks</span>
                    <span>More Opportunities</span>
                  </div>
                  <Slider
                    value={[compensationStrategy.riskOpportunityBalance]}
                    min={-1}
                    max={1}
                    step={0.1}
                    onValueChange={handleBalanceChange}
                    className="cursor-pointer"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  {compensationStrategy.strategyExplanation ||
                    'Balanced approach - showing risks and opportunities equally.'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={resetToDefault}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
