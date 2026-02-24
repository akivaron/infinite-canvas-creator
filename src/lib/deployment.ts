import { supabase } from './supabase';

export interface Deployment {
  id: string;
  user_id: string;
  project_id: string | null;
  deployment_type: 'web' | 'api' | 'database';
  status: 'pending' | 'building' | 'running' | 'stopped' | 'failed' | 'deleted';
  container_id: string | null;
  subdomain: string | null;
  custom_domain: string | null;
  port: number | null;
  environment: Record<string, string>;
  config: Record<string, any>;
  build_logs: string;
  error_message: string | null;
  deployed_at: string | null;
  last_health_check: string | null;
  health_status: 'healthy' | 'unhealthy' | 'unknown';
  created_at: string;
  updated_at: string;
}

export interface HostingPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  storage_gb: number;
  bandwidth_gb: number;
  databases: number;
  apis: number;
  websites: number;
  custom_domain: boolean;
  ssl_certificate: boolean;
  features: string[];
}

export interface StorageInfo {
  deployment_id: string;
  storage_type: 'code' | 'database' | 'static' | 'logs' | 'cache';
  size_bytes: number;
  file_count: number;
  last_calculated: string;
}

export interface DeploymentMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  bandwidth_in: number;
  bandwidth_out: number;
  requests_count: number;
  response_time_avg: number;
  error_count: number;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const deployment = {
  async listPlans(): Promise<{ success: boolean; plans?: HostingPlan[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('hosting_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      return { success: true, plans: data || [] };
    } catch (error) {
      console.error('Error listing plans:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list plans',
      };
    }
  },

  async getActiveSubscription(): Promise<{
    success: boolean;
    subscription?: any;
    error?: string;
  }> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('get_active_subscription', {
        p_user_id: user.id,
      });

      if (error) throw error;

      return { success: true, subscription: data };
    } catch (error) {
      console.error('Error getting subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get subscription',
      };
    }
  },

  async createSubscription(
    planId: string,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('user_subscriptions').insert({
        user_id: user.id,
        plan_id: planId,
        billing_cycle: billingCycle,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
          Date.now() +
            (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      };
    }
  },

  async canDeploy(
    deploymentType: 'web' | 'api' | 'database'
  ): Promise<{ success: boolean; canDeploy: boolean; reason?: string; error?: string }> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('can_user_deploy', {
        p_user_id: user.id,
        p_deployment_type: deploymentType,
      });

      if (error) throw error;

      return {
        success: true,
        canDeploy: data?.can_deploy || false,
        reason: data?.reason,
      };
    } catch (error) {
      console.error('Error checking deploy permission:', error);
      return {
        success: false,
        canDeploy: false,
        error: error instanceof Error ? error.message : 'Failed to check permission',
      };
    }
  },

  async createDeployment(
    projectId: string,
    deploymentType: 'web' | 'api' | 'database',
    config: Record<string, any> = {}
  ): Promise<{ success: boolean; deployment?: Deployment; error?: string }> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const canDeployResult = await this.canDeploy(deploymentType);
      if (!canDeployResult.canDeploy) {
        throw new Error(canDeployResult.reason || 'Cannot deploy');
      }

      const { data: subdomainData, error: subdomainError } = await supabase.rpc(
        'generate_subdomain',
        { p_prefix: deploymentType }
      );

      if (subdomainError) throw subdomainError;

      const { data, error } = await supabase
        .from('deployments')
        .insert({
          user_id: user.id,
          project_id: projectId,
          deployment_type: deploymentType,
          status: 'pending',
          subdomain: subdomainData,
          config,
        })
        .select()
        .single();

      if (error) throw error;

      const buildResult = await fetch(`${BACKEND_URL}/api/deploy/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployment_id: data.id,
          deployment_type: deploymentType,
          project_id: projectId,
          config,
        }),
      });

      if (!buildResult.ok) {
        throw new Error('Failed to start deployment build');
      }

      return { success: true, deployment: data };
    } catch (error) {
      console.error('Error creating deployment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create deployment',
      };
    }
  },

  async listDeployments(): Promise<{
    success: boolean;
    deployments?: Deployment[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('deployments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, deployments: data || [] };
    } catch (error) {
      console.error('Error listing deployments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list deployments',
      };
    }
  },

  async getDeployment(
    deploymentId: string
  ): Promise<{ success: boolean; deployment?: Deployment; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('deployments')
        .select('*')
        .eq('id', deploymentId)
        .single();

      if (error) throw error;

      return { success: true, deployment: data };
    } catch (error) {
      console.error('Error getting deployment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get deployment',
      };
    }
  },

  async stopDeployment(
    deploymentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await fetch(`${BACKEND_URL}/api/deploy/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deployment_id: deploymentId }),
      });

      if (!result.ok) {
        throw new Error('Failed to stop deployment');
      }

      return { success: true };
    } catch (error) {
      console.error('Error stopping deployment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop deployment',
      };
    }
  },

  async deleteDeployment(
    deploymentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.stopDeployment(deploymentId);

      const { error } = await supabase
        .from('deployments')
        .update({ status: 'deleted' })
        .eq('id', deploymentId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting deployment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete deployment',
      };
    }
  },

  async getStorageInfo(
    deploymentId: string
  ): Promise<{ success: boolean; storage?: StorageInfo[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('deployment_storage')
        .select('*')
        .eq('deployment_id', deploymentId);

      if (error) throw error;

      return { success: true, storage: data || [] };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get storage info',
      };
    }
  },

  async getUserStorageTotal(): Promise<{
    success: boolean;
    totalBytes?: number;
    error?: string;
  }> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('calculate_user_storage', {
        p_user_id: user.id,
      });

      if (error) throw error;

      return { success: true, totalBytes: data || 0 };
    } catch (error) {
      console.error('Error getting total storage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get storage',
      };
    }
  },

  async getMetrics(
    deploymentId: string,
    hours: number = 24
  ): Promise<{ success: boolean; metrics?: DeploymentMetrics[]; error?: string }> {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('deployment_metrics')
        .select('*')
        .eq('deployment_id', deploymentId)
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return { success: true, metrics: data || [] };
    } catch (error) {
      console.error('Error getting metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get metrics',
      };
    }
  },

  async getInvoices(): Promise<{ success: boolean; invoices?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('billing_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, invoices: data || [] };
    } catch (error) {
      console.error('Error getting invoices:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get invoices',
      };
    }
  },

  async addCustomDomain(
    deploymentId: string,
    domain: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('deployment_domains').insert({
        deployment_id: deploymentId,
        user_id: user.id,
        domain,
        status: 'pending',
        verification_token: Math.random().toString(36).substring(7),
        dns_records: [
          {
            type: 'A',
            name: '@',
            value: '0.0.0.0',
            ttl: 3600,
          },
          {
            type: 'CNAME',
            name: 'www',
            value: 'your-domain.com',
            ttl: 3600,
          },
        ],
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error adding custom domain:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add domain',
      };
    }
  },

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },

  getDeploymentUrl(deployment: Deployment): string {
    if (deployment.custom_domain) {
      return `https://${deployment.custom_domain}`;
    }
    if (deployment.subdomain) {
      return `https://${deployment.subdomain}.yourdomain.com`;
    }
    return '';
  },
};
