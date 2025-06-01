
"use client";

import type * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Mic, MicOff, Sparkles } from 'lucide-react';

interface AssertionInputFormProps {
  onSubmit: (assertion: string) => void;
  isLoading: boolean;
  initialAssertionText: string; // Changed from assertion to initialAssertionText
  onAssertionChange: (newAssertion: string) => void; // Callback to update parent state
  inputPromptLabel: string;
  placeholder: string;
}

export function AssertionInputForm({
  onSubmit,
  isLoading,
  initialAssertionText,
  onAssertionChange,
  inputPromptLabel,
  placeholder
}: AssertionInputFormProps): JSX.Element {
  // Use initialAssertionText to initialize local state, but allow local editing
  const [currentText, setCurrentText] = useState(initialAssertionText);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Sync with prop changes for initialAssertionText (e.g., when example button is clicked)
  useEffect(() => {
    setCurrentText(initialAssertionText);
  }, [initialAssertionText]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentText(e.target.value);
    onAssertionChange(e.target.value); // Notify parent of change
  };

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsSpeechSupported(true);
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        const newText = (currentText ? currentText.trim() + ' ' + transcript.trim() : transcript.trim()).replace(/\s\s+/g, ' ');
        setCurrentText(newText);
        onAssertionChange(newText); // Notify parent
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
      };
      recognitionRef.current = recognitionInstance;
    } else {
      setIsSpeechSupported(false);
      console.warn('Speech recognition not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Silently ignore
        }
      }
    };
  }, [currentText, onAssertionChange]); // Added currentText and onAssertionChange to dependencies

  const handleToggleListen = () => {
    if (!recognitionRef.current || !isSpeechSupported) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentText.trim()) {
      onSubmit(currentText.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="assertion-input" className="text-lg font-semibold mb-2 block text-foreground">
          {inputPromptLabel}
        </Label>
        <Textarea
          id="assertion-input"
          value={currentText} // Use local state for controlled component
          onChange={handleTextChange} // Use local handler
          placeholder={placeholder}
          rows={4}
          className="w-full bg-card text-card-foreground border-input"
          disabled={isLoading}
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <Button type="submit" disabled={isLoading || !currentText.trim()} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Analyze & Reflect
        </Button>
        {isSpeechSupported ? (
          <Button
            type="button"
            onClick={handleToggleListen}
            disabled={isLoading}
            variant="outline"
            size="icon"
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
