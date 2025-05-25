"use client";

import type * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface AssertionInputFormProps {
  onSubmit: (assertion: string) => void;
  isLoading: boolean;
}

export function AssertionInputForm({ onSubmit, isLoading }: AssertionInputFormProps): JSX.Element {
  const [assertion, setAssertion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assertion.trim()) {
      onSubmit(assertion.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="assertion-input" className="text-lg font-semibold mb-2 block">
          Enter Your Assertion or Idea
        </Label>
        <Textarea
          id="assertion-input"
          value={assertion}
          onChange={(e) => setAssertion(e.target.value)}
          placeholder="e.g., AI will democratize engineering..."
          rows={4}
          className="w-full bg-card text-card-foreground border-input"
          disabled={isLoading}
        />
      </div>
      <Button type="submit" disabled={isLoading || !assertion.trim()} className="w-full sm:w-auto">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Reflect Assertion
      </Button>
    </form>
  );
}
