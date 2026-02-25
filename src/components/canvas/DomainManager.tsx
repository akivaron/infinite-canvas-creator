import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { checkDomainAvailability, purchaseDomain, type DomainAvailability } from '@/lib/domains';
import { useToast } from '@/hooks/use-toast';

interface DomainManagerProps {
  userId: string;
  projectId?: string;
  onDomainPurchased?: (domain: any) => void;
}

export const DomainManager = ({ userId, projectId, onDomainPurchased }: DomainManagerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [result, setResult] = useState<DomainAvailability | null>(null);
  const { toast } = useToast();

  const handleCheck = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a domain name',
        variant: 'destructive',
      });
      return;
    }

    setIsChecking(true);
    setResult(null);

    try {
      const availability = await checkDomainAvailability(searchTerm.trim(), userId);
      setResult(availability);

      if (availability.available) {
        toast({
          title: 'Domain Available!',
          description: `${availability.domain} is available for registration`,
        });
      } else {
        toast({
          title: 'Domain Taken',
          description: `${availability.domain} is not available`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Domain check error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to check domain',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handlePurchase = async () => {
    if (!result || !result.available) return;

    setIsPurchasing(true);

    try {
      const purchaseResult = await purchaseDomain({
        domain: result.domain,
        userId,
        projectId,
        years: 1,
        autoRenew: true,
      });

      toast({
        title: 'Domain Purchased!',
        description: `Successfully purchased ${result.domain}`,
      });

      onDomainPurchased?.(purchaseResult.domain);
      setResult(null);
      setSearchTerm('');
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Failed',
        description: error instanceof Error ? error.message : 'Failed to purchase domain',
        variant: 'destructive',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setSearchTerm(suggestion);
    setIsChecking(true);
    setResult(null);

    try {
      const availability = await checkDomainAvailability(suggestion, userId);
      setResult(availability);
    } catch (error) {
      console.error('Domain check error:', error);
      toast({
        title: 'Error',
        description: 'Failed to check domain',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Domain Manager
        </CardTitle>
        <CardDescription>
          Search and register custom domains for your deployment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter domain name (e.g., myapp.com)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            disabled={isChecking}
          />
          <Button onClick={handleCheck} disabled={isChecking}>
            {isChecking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span className="ml-2">Check</span>
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <Separator />

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {result.available ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                <div>
                  <div className="font-medium">{result.domain}</div>
                  <div className="text-sm text-muted-foreground">
                    {result.available ? 'Available for registration' : 'Already registered'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {result.available && result.price && (
                  <div className="text-right">
                    <div className="flex items-center gap-1 font-bold text-lg">
                      <DollarSign className="w-4 h-4" />
                      {result.price}
                    </div>
                    <div className="text-xs text-muted-foreground">per year</div>
                  </div>
                )}

                {result.available && (
                  <Button onClick={handlePurchase} disabled={isPurchasing}>
                    {isPurchasing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )}
                    <span className="ml-2">Purchase</span>
                  </Button>
                )}
              </div>
            </div>

            {result.available && (
              <Alert>
                <TrendingUp className="w-4 h-4" />
                <AlertDescription>
                  This domain is available! Purchase now to secure your custom domain for deployment.
                </AlertDescription>
              </Alert>
            )}

            {result.suggestions && result.suggestions.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Alternative Suggestions:</div>
                <div className="flex flex-wrap gap-2">
                  {result.suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={isChecking}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <div>Registrar: {result.registrar}</div>
              <div>Currency: {result.currency}</div>
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="text-sm font-medium">Popular TLDs:</div>
          <div className="flex flex-wrap gap-2">
            {['.com', '.io', '.dev', '.app', '.net', '.org', '.co'].map((tld) => (
              <Badge key={tld} variant="secondary" className="cursor-default">
                {tld}
              </Badge>
            ))}
          </div>
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            After purchasing, your domain will be automatically configured with DNS records and SSL certificate.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
