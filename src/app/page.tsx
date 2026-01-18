'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { useDialogueStore } from '@/store/dialogue-store';
import { ConversationPanel } from '@/components/cascade-explorer/ConversationPanel';
import { VisualizationPanel } from '@/components/cascade-explorer/VisualizationPanel';
import { AdaptationPanel } from '@/components/cascade-explorer/AdaptationPanel';
import { SettingsPanel } from '@/components/cascade-explorer/SettingsPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Settings,
  RotateCcw,
  Github,
  Menu,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

function StatusBar() {
  const phase = useDialogueStore((s) => s.phase);
  const turns = useDialogueStore((s) => s.turns);
  const agreedItems = useDialogueStore((s) => s.agreedItems);
  const openQuestions = useDialogueStore((s) => s.openQuestions);

  const phaseLabels: Record<string, { label: string; color: string }> = {
    welcome: { label: 'Ready', color: 'bg-gray-500' },
    seeding: { label: 'Analyzing', color: 'bg-blue-500' },
    reflecting: { label: 'Understanding', color: 'bg-purple-500' },
    negotiating: { label: 'Refining', color: 'bg-amber-500' },
    expanding: { label: 'Expanding', color: 'bg-green-500' },
    grounding: { label: 'Grounding', color: 'bg-cyan-500' },
    concluding: { label: 'Synthesizing', color: 'bg-rose-500' },
  };

  const phaseConfig = phaseLabels[phase] || { label: phase, color: 'bg-gray-500' };

  return (
    <div className="h-10 border-t bg-muted/30 flex items-center justify-between px-4 text-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${phaseConfig.color} animate-pulse`} />
          <span className="text-muted-foreground">{phaseConfig.label}</span>
        </div>

        <span className="text-muted-foreground">
          {turns.length} message{turns.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {agreedItems.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {agreedItems.length} agreed
          </Badge>
        )}
        {openQuestions.length > 0 && (
          <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/30">
            {openQuestions.length} open
          </Badge>
        )}
      </div>
    </div>
  );
}

function Header() {
  const isConfigured = useSettingsStore((s) => s.isConfigured);
  const resetSession = useDialogueStore((s) => s.resetSession);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">CascadeExplorer</h1>
            <p className="text-xs text-muted-foreground">Systems Thinking Partner</p>
          </div>
        </div>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetSession}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          New Session
        </Button>

        <SettingsPanel />

        <Button variant="ghost" size="icon" asChild>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="h-4 w-4" />
          </a>
        </Button>
      </nav>

      {/* Mobile menu */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <div className="flex flex-col gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => {
                resetSession();
                setIsMobileMenuOpen(false);
              }}
              className="justify-start gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              New Session
            </Button>

            <SettingsPanel
              trigger={
                <Button variant="outline" className="justify-start gap-2 w-full">
                  <Settings className="h-4 w-4" />
                  AI Settings
                  {isConfigured && (
                    <Badge className="ml-auto" variant="outline">
                      Connected
                    </Badge>
                  )}
                </Button>
              }
            />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function MobileLayout() {
  const [activePanel, setActivePanel] = useState<'conversation' | 'visualization'>('conversation');

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Panel toggle */}
      <div className="flex border-b">
        <Button
          variant={activePanel === 'conversation' ? 'default' : 'ghost'}
          className="flex-1 rounded-none"
          onClick={() => setActivePanel('conversation')}
        >
          <PanelLeft className="h-4 w-4 mr-2" />
          Conversation
        </Button>
        <Button
          variant={activePanel === 'visualization' ? 'default' : 'ghost'}
          className="flex-1 rounded-none"
          onClick={() => setActivePanel('visualization')}
        >
          <PanelRight className="h-4 w-4 mr-2" />
          Visualization
        </Button>
      </div>

      {/* Active panel */}
      <div className="flex-1 overflow-hidden">
        {activePanel === 'conversation' ? (
          <ConversationPanel />
        ) : (
          <VisualizationPanel />
        )}
      </div>

      <StatusBar />
    </div>
  );
}

function DesktopLayout() {
  const conversationWidth = useSettingsStore((s) => s.conversationPanelWidth);

  return (
    <div className="flex h-[calc(100vh-3.5rem-2.5rem)]">
      {/* Conversation Panel */}
      <div
        className="border-r flex flex-col"
        style={{ width: `${conversationWidth}%` }}
      >
        <ConversationPanel />
      </div>

      {/* Visualization Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <VisualizationPanel />
      </div>

      {/* Adaptation Panel */}
      <AdaptationPanel />
    </div>
  );
}

export default function CascadeExplorerPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center animate-pulse">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-muted-foreground">Loading CascadeExplorer...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      {isMobile ? <MobileLayout /> : (
        <>
          <DesktopLayout />
          <StatusBar />
        </>
      )}
    </div>
  );
}
