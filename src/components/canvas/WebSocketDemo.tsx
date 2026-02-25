import { useEffect, useState } from 'react';
import { useAIWebSocket } from '@/hooks/use-websocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Radio } from 'lucide-react';

export const WebSocketDemo = () => {
  const [sessionId] = useState(`demo_${Date.now()}`);
  const {
    isConnected,
    isConnecting,
    aiStatus,
    aiProgress,
    aiResult,
    aiError,
    lastMessage,
    reconnect,
    disconnect,
  } = useAIWebSocket(sessionId);

  useEffect(() => {
    console.log('WebSocket Demo mounted with session:', sessionId);
  }, [sessionId]);

  const getStatusColor = () => {
    switch (aiStatus) {
      case 'processing':
        return 'bg-blue-500';
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (aiStatus) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'complete':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Radio className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              WebSocket Connection
              {getStatusIcon()}
            </CardTitle>
            <CardDescription>Real-time AI notifications</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Session ID:</div>
          <div className="text-xs font-mono bg-muted p-2 rounded">
            {sessionId}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">AI Status:</div>
          <Badge className={getStatusColor()}>
            {aiStatus.toUpperCase()}
          </Badge>
        </div>

        {aiProgress && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Progress:</div>
            <div className="text-xs bg-muted p-2 rounded">
              <pre>{JSON.stringify(aiProgress, null, 2)}</pre>
            </div>
          </div>
        )}

        {aiResult && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Result:</div>
            <div className="text-xs bg-green-50 dark:bg-green-950 p-2 rounded border border-green-200 dark:border-green-800">
              <pre>{JSON.stringify(aiResult, null, 2)}</pre>
            </div>
          </div>
        )}

        {aiError && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Error:</div>
            <div className="text-xs bg-red-50 dark:bg-red-950 p-2 rounded border border-red-200 dark:border-red-800">
              <pre>{JSON.stringify(aiError, null, 2)}</pre>
            </div>
          </div>
        )}

        {lastMessage && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Last Message:</div>
            <div className="text-xs bg-muted p-2 rounded max-h-32 overflow-auto">
              <pre>{JSON.stringify(lastMessage, null, 2)}</pre>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isConnected ? (
            <Button onClick={reconnect} size="sm">
              Reconnect
            </Button>
          ) : (
            <Button onClick={disconnect} variant="destructive" size="sm">
              Disconnect
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <p className="font-medium">WebSocket Events:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <code className="text-xs bg-muted px-1 rounded">ai_start</code> - AI processing started
            </li>
            <li>
              <code className="text-xs bg-muted px-1 rounded">ai_progress</code> - Progress updates
            </li>
            <li>
              <code className="text-xs bg-muted px-1 rounded">ai_complete</code> - AI processing completed
            </li>
            <li>
              <code className="text-xs bg-muted px-1 rounded">ai_error</code> - Error occurred
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
