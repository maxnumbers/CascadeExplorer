
"use client";

import type * as React from 'react';
import { useState } from 'react';
import type { SystemModel, ReviseSystemModelOutput } from '@/types/cascade';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquareText, CheckCircle } from 'lucide-react';
import { ReflectionDisplay } from './ReflectionDisplay'; // To display current model

interface SystemModelFeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentSystemModel: SystemModel;
  currentReflection: { summary: string; reflection: string; keyConcepts: any[], confirmationQuestion: string; systemModel: SystemModel }; // Pass enough for ReflectionDisplay
  onRevisionSubmit: (feedbackText: string) => Promise<ReviseSystemModelOutput | null>; // Returns the revised model or null on error
}

export function SystemModelFeedbackDialog({
  isOpen,
  onClose,
  currentSystemModel,
  currentReflection,
  onRevisionSubmit,
}: SystemModelFeedbackDialogProps): JSX.Element {
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isRevising, setIsRevising] = useState<boolean>(false);
  const [revisionResult, setRevisionResult] = useState<ReviseSystemModelOutput | null>(null);

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsRevising(true);
    setRevisionResult(null);
    const result = await onRevisionSubmit(feedbackText);
    setRevisionResult(result); // Store result to display summary, even if it's an error/fallback
    setIsRevising(false);
    if (result && result.revisedSystemModel !== currentSystemModel) { // i.e. AI didn't just return original
        // Potentially close dialog on successful non-trivial revision or let user close
        // For now, let's keep it open to show summary. User can close.
    }
  };

  const handleCloseDialog = () => {
    setFeedbackText('');
    setRevisionResult(null);
    setIsRevising(false);
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-2xl bg-card text-card-foreground border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary flex items-center">
            <MessageSquareText className="w-6 h-6 mr-2 text-accent" />
            Suggest Revisions to System Model
          </DialogTitle>
          <DialogDescription>
            Review the AI's current system model below. If you see issues or omissions, describe the changes you'd like the AI to make.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] p-1 pr-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-accent border-b pb-2">Current System Model</h3>
              {/* Minimal reflection object for display purposes */}
              <ReflectionDisplay 
                reflection={{
                    summary: currentReflection.summary,
                    reflection: currentReflection.reflection,
                    systemModel: currentSystemModel, // Show the one passed, which could be revised
                    keyConcepts: currentReflection.keyConcepts,
                    confirmationQuestion: "" // Not relevant here
                }}
                showSystemModelDetails={true}
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-accent border-b pb-2">Your Feedback</h3>
              <div>
                <Label htmlFor="feedback-text" className="text-md text-foreground">
                  Describe what's wrong or what changes you'd like:
                </Label>
                <Textarea
                  id="feedback-text"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g., 'The 'Government' agent is missing.' or 'The incentive for 'Consumers' regarding 'Product Quality' should be stronger.'"
                  rows={8}
                  className="mt-1 w-full bg-input text-foreground border-input"
                  disabled={isRevising || !!revisionResult}
                />
              </div>
              {revisionResult && (
                <div className={`mt-4 p-3 rounded-md ${revisionResult.revisedSystemModel !== currentSystemModel ? 'bg-green-500/10 border-green-500/50' : 'bg-amber-500/10 border-amber-500/50'} border`}>
                  <h4 className="font-semibold text-primary flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2"/> AI Revision Summary:
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{revisionResult.revisionSummary}</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t border-border">
          <DialogClose asChild>
            <Button variant="outline" onClick={handleCloseDialog}>
              {revisionResult ? 'Close' : 'Cancel'}
            </Button>
          </DialogClose>
          {!revisionResult && (
             <Button 
                onClick={handleSubmitFeedback} 
                disabled={isRevising || !feedbackText.trim()}
                className="bg-primary text-primary-foreground"
            >
            {isRevising ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareText className="mr-2 h-4 w-4" />}
            Submit Feedback & Revise
          </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
