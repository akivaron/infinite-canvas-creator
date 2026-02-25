import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Globe,
  Shield,
  Calendar,
  Trash2,
  Settings,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { listUserDomains, deleteDomain, enableSSL, type Domain } from '@/lib/domains';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DomainListProps {
  userId: string;
  onDomainSelect?: (domain: Domain) => void;
}

export const DomainList = ({ userId, onDomainSelect }: DomainListProps) => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [enablingSSL, setEnablingSSL] = useState<string | null>(null);
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null);
  const { toast } = useToast();

  const loadDomains = async () => {
    setIsLoading(true);
    try {
      const result = await listUserDomains(userId);
      setDomains(result.domains);
    } catch (error) {
      console.error('Failed to load domains:', error);
      toast({
        title: 'Error',
        description: 'Failed to load domains',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, [userId]);

  const handleDelete = async () => {
    if (!domainToDelete) return;

    setDeletingId(domainToDelete.id);
    try {
      await deleteDomain(domainToDelete.id);
      toast({
        title: 'Domain Deleted',
        description: `${domainToDelete.domain_name} has been removed`,
      });
      setDomains(domains.filter((d) => d.id !== domainToDelete.id));
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete domain',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
      setDomainToDelete(null);
    }
  };

  const handleEnableSSL = async (domain: Domain) => {
    setEnablingSSL(domain.id);
    try {
      await enableSSL(domain.id);
      toast({
        title: 'SSL Enabled',
        description: `SSL certificate enabled for ${domain.domain_name}`,
      });

      setDomains(
        domains.map((d) =>
          d.id === domain.id ? { ...d, ssl_enabled: true, ssl_provider: 'letsencrypt' } : d
        )
      );
    } catch (error) {
      console.error('SSL enable error:', error);
      toast({
        title: 'SSL Failed',
        description: error instanceof Error ? error.message : 'Failed to enable SSL',
        variant: 'destructive',
      });
    } finally {
      setEnablingSSL(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'expired':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (domains.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Globe className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No domains registered yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Purchase a domain to get started with custom hosting
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            My Domains
          </CardTitle>
          <CardDescription>Manage your registered domains</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {domains.map((domain) => (
            <div key={domain.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{domain.domain_name}</h3>
                    <Badge className={getStatusColor(domain.status)}>{domain.status}</Badge>
                    {domain.ssl_enabled && (
                      <Badge variant="outline" className="gap-1">
                        <Shield className="w-3 h-3" />
                        SSL
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      Purchased: {formatDate(domain.purchase_date)}
                    </div>
                    {domain.expiry_date && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        Expires: {formatDate(domain.expiry_date)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!domain.ssl_enabled && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEnableSSL(domain)}
                      disabled={enablingSSL === domain.id}
                    >
                      {enablingSSL === domain.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDomainSelect?.(domain)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDomainToDelete(domain)}
                    disabled={deletingId === domain.id}
                  >
                    {deletingId === domain.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Registrar</div>
                  <div className="font-medium">{domain.registrar}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Auto-Renew</div>
                  <div className="flex items-center gap-1">
                    {domain.auto_renew ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span>{domain.auto_renew ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Price Paid</div>
                  <div className="font-medium">
                    ${domain.price_paid} {domain.currency}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Nameservers</div>
                  <div className="font-medium">{domain.nameservers.length} configured</div>
                </div>
              </div>

              {domain.domain_name && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => window.open(`https://${domain.domain_name}`, '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Visit Domain
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!domainToDelete} onOpenChange={() => setDomainToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {domainToDelete?.domain_name}? This action cannot be undone
              and the domain will be released.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
