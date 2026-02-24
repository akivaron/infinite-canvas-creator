import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket, X, Globe, Database, Server, CheckCircle, XCircle, Clock,
  TrendingUp, HardDrive, Zap, DollarSign, ExternalLink, Settings,
  Activity, AlertCircle, Play, Square, Trash2, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deployment, type Deployment, type HostingPlan } from '@/lib/deployment';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

interface DeploymentPanelProps {
  projectId: string;
  onClose: () => void;
}

export function DeploymentPanel({ projectId, onClose }: DeploymentPanelProps) {
  const [activeTab, setActiveTab] = useState<'deployments' | 'plans' | 'billing'>('deployments');
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [storageTotal, setStorageTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewDeployment, setShowNewDeployment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    const [deploymentsResult, plansResult, subscriptionResult, storageResult] = await Promise.all([
      deployment.listDeployments(),
      deployment.listPlans(),
      deployment.getActiveSubscription(),
      deployment.getUserStorageTotal(),
    ]);

    if (deploymentsResult.success) setDeployments(deploymentsResult.deployments || []);
    if (plansResult.success) setPlans(plansResult.plans || []);
    if (subscriptionResult.success) setSubscription(subscriptionResult.subscription);
    if (storageResult.success) setStorageTotal(storageResult.totalBytes || 0);

    setIsLoading(false);
  };

  const handleDeploy = async (type: 'web' | 'api' | 'database') => {
    const canDeployResult = await deployment.canDeploy(type);

    if (!canDeployResult.canDeploy) {
      toast({
        title: 'Cannot Deploy',
        description: canDeployResult.reason || 'Deployment limit reached',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const result = await deployment.createDeployment(projectId, type, {});

    if (result.success) {
      toast({
        title: 'Deployment Started',
        description: `${type.toUpperCase()} deployment is being built...`,
      });
      setShowNewDeployment(false);
      loadData();
    } else {
      toast({
        title: 'Deployment Failed',
        description: result.error || 'Failed to start deployment',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const handleStop = async (deploymentId: string) => {
    const result = await deployment.stopDeployment(deploymentId);

    if (result.success) {
      toast({ title: 'Deployment Stopped' });
      loadData();
    } else {
      toast({
        title: 'Stop Failed',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (deploymentId: string) => {
    const result = await deployment.deleteDeployment(deploymentId);

    if (result.success) {
      toast({ title: 'Deployment Deleted' });
      loadData();
    } else {
      toast({
        title: 'Delete Failed',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'building':
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'web':
        return <Globe className="w-4 h-4" />;
      case 'api':
        return <Server className="w-4 h-4" />;
      case 'database':
        return <Database className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-0 right-0 h-full w-[600px] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Deployment & Hosting</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('deployments')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'deployments'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Deployments
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'plans'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Plans & Billing
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'deployments' && (
          <div className="space-y-4">
            {subscription && (
              <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold">{subscription.plan} Plan</h3>
                    <p className="text-xs text-muted-foreground">Active Subscription</p>
                  </div>
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <HardDrive className="w-4 h-4" />
                      Storage
                    </div>
                    <div className="font-medium">
                      {deployment.formatBytes(storageTotal)} / {deployment.formatBytes(subscription.storage_limit)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Activity className="w-4 h-4" />
                      Status
                    </div>
                    <div className="font-medium text-green-600">{subscription.status}</div>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Your Deployments</h3>
              <Button size="sm" onClick={() => setShowNewDeployment(true)}>
                <Rocket className="w-4 h-4 mr-2" />
                New Deployment
              </Button>
            </div>

            {deployments.length === 0 ? (
              <Card className="p-8 text-center">
                <Rocket className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground mb-4">
                  No deployments yet. Deploy your first app!
                </p>
                <Button onClick={() => setShowNewDeployment(true)}>
                  <Rocket className="w-4 h-4 mr-2" />
                  Create Deployment
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {deployments.map((dep) => (
                  <Card key={dep.id} className="p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {getTypeIcon(dep.deployment_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{dep.deployment_type.toUpperCase()}</h4>
                            {getStatusIcon(dep.status)}
                            <span className="text-xs text-muted-foreground">{dep.status}</span>
                          </div>
                          {dep.subdomain && (
                            <a
                              href={deployment.getDeploymentUrl(dep)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                            >
                              {dep.subdomain}.yourdomain.com
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {dep.status === 'running' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStop(dep.id)}
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(dep.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {dep.status === 'building' && dep.build_logs && (
                      <div className="mt-2 p-2 rounded bg-muted/50 text-xs font-mono max-h-32 overflow-y-auto">
                        {dep.build_logs.split('\n').slice(-5).map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="space-y-4">
            <h3 className="font-semibold">Hosting Plans</h3>
            <div className="grid gap-4">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`p-4 ${
                    subscription?.plan === plan.name ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-lg">{plan.name}</h4>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl">${plan.price_monthly}</div>
                      <div className="text-xs text-muted-foreground">/month</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      {plan.storage_gb} GB Storage
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      {plan.bandwidth_gb} GB Bandwidth
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      {plan.databases} Database{plan.databases > 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-muted-foreground" />
                      {plan.apis} API{plan.apis > 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      {plan.websites} Website{plan.websites > 1 ? 's' : ''}
                    </div>
                  </div>

                  {subscription?.plan === plan.name ? (
                    <Button disabled className="w-full">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      variant={plan.name === 'Free' ? 'outline' : 'default'}
                      className="w-full"
                    >
                      {plan.name === 'Free' ? 'Start Free' : 'Upgrade'}
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNewDeployment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center p-6"
            onClick={() => setShowNewDeployment(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4">Choose Deployment Type</h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleDeploy('web')}
                  className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-6 h-6 text-primary" />
                    <div>
                      <div className="font-medium">Web Application</div>
                      <div className="text-sm text-muted-foreground">
                        Deploy static or server-rendered web app
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleDeploy('api')}
                  className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Server className="w-6 h-6 text-primary" />
                    <div>
                      <div className="font-medium">API Server</div>
                      <div className="text-sm text-muted-foreground">
                        Deploy REST or GraphQL API
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleDeploy('database')}
                  className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-6 h-6 text-primary" />
                    <div>
                      <div className="font-medium">Database</div>
                      <div className="text-sm text-muted-foreground">
                        Deploy isolated PostgreSQL database
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setShowNewDeployment(false)}
              >
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
