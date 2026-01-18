'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { MODEL_PROVIDERS, type ModelProvider } from '@/ai/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Check, Loader2, AlertCircle, Eye, EyeOff, Info, Server, Cloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SettingsPanelProps {
  trigger?: React.ReactNode;
}

export function SettingsPanel({ trigger }: SettingsPanelProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const {
    provider,
    modelId,
    apiKey,
    isConfigured,
    customBaseUrl,
    customModelId,
    setProvider,
    setModelId,
    setApiKey,
    setCustomBaseUrl,
    setCustomModelId,
    validateAndConnect,
    clearConfiguration,
  } = useSettingsStore();

  const providerConfig = MODEL_PROVIDERS[provider];
  const isLocalProvider = provider === 'ollama' || provider === 'litellm';
  const isCustomProvider = provider === 'custom';
  const requiresApiKey = providerConfig.requiresApiKey;

  const handleValidate = async () => {
    setIsValidating(true);
    const result = await validateAndConnect();
    setIsValidating(false);

    if (result.success) {
      const modelName = isCustomProvider
        ? (customModelId || 'custom model')
        : (providerConfig.models.find(m => m.id === modelId)?.name || modelId);
      toast({
        title: 'Connected!',
        description: `Successfully connected to ${providerConfig.name} with ${modelName}.`,
      });
      setIsOpen(false);
    } else {
      toast({
        title: 'Connection Failed',
        description: result.error || 'Could not connect to the AI service.',
        variant: 'destructive',
      });
    }
  };

  const handleClear = () => {
    clearConfiguration();
    toast({
      title: 'Configuration Cleared',
      description: 'Your configuration has been reset.',
    });
  };

  const canConnect = isCustomProvider
    ? customBaseUrl && (customModelId || modelId)
    : (isLocalProvider || apiKey);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            {isConfigured ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <Check className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Model Settings
          </DialogTitle>
          <DialogDescription>
            Connect to any AI provider. Supports OpenAI, Anthropic, Together AI, Groq, local models via Ollama, or LiteLLM proxy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">AI Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => setProvider(value as ModelProvider)}
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODEL_PROVIDERS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {key === 'ollama' || key === 'litellm' ? (
                        <Server className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Cloud className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{config.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Provider note */}
            {'note' in providerConfig && providerConfig.note && (
              <div className="flex items-start gap-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{providerConfig.note}</span>
              </div>
            )}
          </div>

          {/* Custom Base URL (for custom provider or LiteLLM) */}
          {(isCustomProvider || provider === 'litellm') && (
            <div className="space-y-2">
              <Label htmlFor="baseUrl">
                {isCustomProvider ? 'API Endpoint URL' : 'LiteLLM Proxy URL'}
              </Label>
              <Input
                id="baseUrl"
                type="url"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder={isCustomProvider ? 'https://your-api.com/v1' : 'http://localhost:4000/v1'}
              />
              <p className="text-xs text-muted-foreground">
                {isCustomProvider
                  ? 'Enter any OpenAI-compatible API endpoint'
                  : 'Default: http://localhost:4000/v1'}
              </p>
            </div>
          )}

          {/* Model Selection */}
          {!isCustomProvider && (
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {providerConfig.models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span>{model.name}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Model ID (for custom provider) */}
          {isCustomProvider && (
            <div className="space-y-2">
              <Label htmlFor="customModel">Model ID</Label>
              <Input
                id="customModel"
                type="text"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder="gpt-4o, claude-3-5-sonnet, llama-3.1-70b, etc."
              />
              <p className="text-xs text-muted-foreground">
                Enter the model identifier your endpoint expects
              </p>
            </div>
          )}

          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key
              {!requiresApiKey && (
                <span className="text-muted-foreground font-normal ml-2">(optional)</span>
              )}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={providerConfig.apiKeyPlaceholder || 'Enter API key'}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {isLocalProvider
                ? 'API key may not be required for local providers.'
                : 'Your API key is stored locally in your browser and never sent to our servers.'}
            </p>
          </div>

          {/* Connection Status */}
          {isConfigured && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Check className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-500">Connected</p>
                <p className="text-xs text-muted-foreground">
                  {providerConfig.name}: {
                    isCustomProvider
                      ? (customModelId || 'custom model')
                      : (providerConfig.models.find(m => m.id === modelId)?.name || modelId)
                  }
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Disconnect
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleValidate} disabled={!canConnect || isValidating}>
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {isConfigured ? 'Update & Test' : 'Connect'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
