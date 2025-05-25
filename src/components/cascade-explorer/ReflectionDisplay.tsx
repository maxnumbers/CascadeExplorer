"use client";

import type { AIReflectAssertionOutput } from '@/types/cascade';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';

interface ReflectionDisplayProps {
  reflection: AIReflectAssertionOutput;
  onConfirm: () => void;
  isLoadingConfirmation: boolean;
}

export function ReflectionDisplay({ reflection, onConfirm, isLoadingConfirmation }: ReflectionDisplayProps): JSX.Element {
  return (
    <Card className="mt-6 shadow-lg bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-xl">Assertion Reflection</CardTitle>
        <CardDescription>Please review the AI's understanding of your assertion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-primary">Summary:</h3>
          <p>{reflection.summary}</p>
        </div>
        <div>
          <h3 className="font-semibold text-primary">Reflection:</h3>
          <p>{reflection.reflection}</p>
        </div>
        {reflection.coreComponents && reflection.coreComponents.length > 0 && (
          <div>
            <h3 className="font-semibold text-primary">Core Components:</h3>
            <ul className="list-disc list-inside ml-4">
              {reflection.coreComponents.map((component, index) => (
                <li key={index}>{component}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h3 className="font-semibold text-primary">Confirmation Question:</h3>
          <p className="italic">{reflection.confirmationQuestion}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onConfirm} disabled={isLoadingConfirmation} className="w-full sm:w-auto">
          {isLoadingConfirmation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Yes, this is correct. Generate Impact Map.
        </Button>
      </CardFooter>
    </Card>
  );
}
