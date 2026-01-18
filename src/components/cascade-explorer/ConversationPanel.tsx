'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDialogueStore } from '@/store/dialogue-store';
import { useSettingsStore } from '@/store/settings-store';
import { useConversation } from '@/hooks/use-conversation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Send,
  Mic,
  MicOff,
  Loader2,
  User,
  Bot,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  turn: {
    id: string;
    actor: 'user' | 'ai';
    content: string;
    moveType: string;
    timestamp: string;
    structuredContent?: {
      quickActions?: Array<{ label: string; action: string }>;
    };
    isStreaming?: boolean;
    error?: string;
  };
  onQuickAction?: (action: string) => void;
}

function MessageBubble({ turn, onQuickAction }: MessageBubbleProps) {
  const isUser = turn.actor === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary/20' : 'bg-accent/20'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Bot className="h-4 w-4 text-accent" />
        )}
      </div>

      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block p-3 rounded-lg ${
            isUser
              ? 'bg-primary/10 text-foreground'
              : 'bg-muted/50 text-foreground'
          } ${turn.error ? 'border border-destructive/50' : ''}`}
        >
          {turn.error ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{turn.error}</span>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {turn.content}
              </ReactMarkdown>
            </div>
          )}

          {turn.isStreaming && (
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">Thinking...</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {!isUser && turn.structuredContent?.quickActions && (
          <div className="flex flex-wrap gap-2 mt-2">
            {turn.structuredContent.quickActions.map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => onQuickAction?.(action.action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-1">
          {new Date(turn.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>

      <h2 className="text-2xl font-bold mb-3">Welcome to CascadeExplorer</h2>

      <p className="text-muted-foreground max-w-md mb-6">
        I'm your thinking partner for exploring complex decisions and ideas.
        Share an assertion, decision, or question you'd like to analyze.
      </p>

      <div className="grid gap-3 max-w-lg w-full">
        <Card className="p-4 text-left hover:bg-muted/50 cursor-pointer transition-colors">
          <h3 className="font-medium mb-1">🎯 Test a Decision</h3>
          <p className="text-sm text-muted-foreground">
            "Should we adopt a 4-day work week?"
          </p>
        </Card>
        <Card className="p-4 text-left hover:bg-muted/50 cursor-pointer transition-colors">
          <h3 className="font-medium mb-1">🔍 Find Blind Spots</h3>
          <p className="text-sm text-muted-foreground">
            "What could go wrong with our expansion plan?"
          </p>
        </Card>
        <Card className="p-4 text-left hover:bg-muted/50 cursor-pointer transition-colors">
          <h3 className="font-medium mb-1">💡 Explore an Idea</h3>
          <p className="text-sm text-muted-foreground">
            "How will AI transform education over the next decade?"
          </p>
        </Card>
      </div>
    </div>
  );
}

export function ConversationPanel() {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const { turns, phase, isProcessing, addUserTurn } = useDialogueStore();
  const { isConfigured } = useSettingsStore();
  const { sendMessage, processInitialAssertion, generateImpacts, requestPerspective } = useConversation();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [turns, scrollToBottom]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing || !isConfigured) return;

    const message = input.trim();
    setInput('');

    // If this is the first message, process as initial assertion
    if (phase === 'welcome' || phase === 'seeding') {
      await processInitialAssertion(message);
    } else {
      await sendMessage(message);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (isProcessing) return;

    switch (action) {
      case 'confirm':
        await generateImpacts(1);
        break;
      case 'refine':
        addUserTurn("Let me clarify what I meant...", 'refinement');
        break;
      case 'generate_2':
        await generateImpacts(2);
        break;
      case 'generate_3':
        await generateImpacts(3);
        break;
      case 'perspective':
        // Could prompt for which perspective
        await requestPerspective('external stakeholder');
        break;
      case 'discuss':
        addUserTurn("I'd like to discuss these impacts further.", 'question');
        break;
      case 'challenge':
        addUserTurn("I'm not sure about some of these. Let me explain...", 'challenge');
        break;
      default:
        await sendMessage(action);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {turns.length === 0 ? (
          <WelcomeMessage />
        ) : (
          <div className="space-y-4">
            {turns.map((turn) => (
              <MessageBubble
                key={turn.id}
                turn={turn}
                onQuickAction={handleQuickAction}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4 bg-background/95 backdrop-blur">
        {!isConfigured && (
          <div className="mb-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-yellow-500">Configure your AI settings to start exploring.</span>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                phase === 'welcome' || phase === 'seeding'
                  ? "Share an idea, decision, or question to explore..."
                  : "Continue the conversation..."
              }
              className="min-h-[60px] max-h-[200px] resize-none pr-20"
              disabled={isProcessing || !isConfigured}
            />
            <div className="absolute right-2 bottom-2 flex gap-1">
              {recognitionRef.current && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleListening}
                  disabled={isProcessing || !isConfigured}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4 text-destructive" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                className="h-8 w-8"
                onClick={handleSubmit}
                disabled={!input.trim() || isProcessing || !isConfigured}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>AI is thinking...</span>
          </div>
        )}

        {/* Phase indicator */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {phase === 'welcome' && 'Ready to explore'}
              {phase === 'seeding' && 'Analyzing input'}
              {phase === 'reflecting' && 'Understanding your idea'}
              {phase === 'negotiating' && 'Refining the model'}
              {phase === 'expanding' && 'Generating impacts'}
              {phase === 'grounding' && 'Finding evidence'}
              {phase === 'concluding' && 'Synthesizing insights'}
            </Badge>
          </div>
          <span>
            {turns.length} message{turns.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
