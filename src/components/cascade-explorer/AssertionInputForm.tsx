
"use client";

import type * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Mic, MicOff } from 'lucide-react';

interface AssertionInputFormProps {
  onSubmit: (assertion: string) => void;
  isLoading: boolean;
}

export function AssertionInputForm({ onSubmit, isLoading }: AssertionInputFormProps): JSX.Element {
  const [assertion, setAssertion] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsSpeechSupported(true);
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = false; // Process a single utterance
      recognitionInstance.interimResults = false; // We only want final results
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        // Append to existing text or replace, ensuring spaces are handled correctly
        setAssertion(prev => (prev ? prev.trim() + ' ' + transcript.trim() : transcript.trim()).replace(/\s\s+/g, ' '));
      };

      recognitionInstance.onstart = () => {
        setIsListening(true);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error, event.message);
        setIsListening(false);
        // TODO: Optionally show a user-friendly error message via toast or inline text
      };
      recognitionRef.current = recognitionInstance;
    } else {
      setIsSpeechSupported(false);
      console.warn('Speech recognition not supported in this browser.');
    }

    // Cleanup function when the component unmounts
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        // Try to stop it if it's active, though onend should handle setIsListening
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Silently ignore if it's already stopped or in an invalid state
        }
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  const handleToggleListen = () => {
    if (!recognitionRef.current || !isSpeechSupported) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // To allow appending, we don't clear the assertion here.
      // If you want to clear before each new speech input: setAssertion('');
      recognitionRef.current.start();
    }
  };

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
          placeholder="e.g., AI will democratize engineering... or click the mic to speak."
          rows={4}
          className="w-full bg-card text-card-foreground border-input"
          disabled={isLoading}
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <Button type="submit" disabled={isLoading || !assertion.trim()} className="w-full sm:w-auto">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Reflect Assertion
        </Button>
        {isSpeechSupported ? (
          <Button
            type="button"
            onClick={handleToggleListen}
            disabled={isLoading} // Disable if main form is loading
            variant="outline"
            size="icon" // Keeps it square and icon-sized
            className="p-2 text-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            title={isListening ? "Stop voice input" : "Start voice input"}
          >
            {isListening ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5 text-primary" />}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Voice input not supported by your browser.</p>
        )}
      </div>
    </form>
  );
}
