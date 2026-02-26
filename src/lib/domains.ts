import { fetchWithRetry } from './fetchWithRetry';

const API_BASE = 'http://localhost:3001';

export interface DomainAvailability {
  domain: string;
  available: boolean;
  price?: number;
  currency: string;
  registrar: string;
  suggestions?: string[];
  error?: string;
}

export interface Domain {
  id: string;
  user_id: string;
  project_id?: string;
  domain_name: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  registrar: string;
  purchase_date: string;
  expiry_date?: string;
  auto_renew: boolean;
  nameservers: string[];
  dns_records: any[];
  ssl_enabled: boolean;
  ssl_provider?: string;
  price_paid: number;
  currency: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT';
  name: string;
  value: string;
  ttl?: number;
}

export const checkDomainAvailability = async (
  domain: string,
  userId: string
): Promise<DomainAvailability> => {
  const response = await fetchWithRetry(`${API_BASE}/api/domains/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ domain, userId }),
  });

  if (!response.ok) {
    throw new Error('Failed to check domain availability');
  }

  return response.json();
};

export const checkMultipleDomains = async (
  domains: string[],
  userId: string
): Promise<{ results: DomainAvailability[] }> => {
  const response = await fetchWithRetry(`${API_BASE}/api/domains/check-multiple`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ domains, userId }),
  });

  if (!response.ok) {
    throw new Error('Failed to check multiple domains');
  }

  return response.json();
};

export const purchaseDomain = async (params: {
  domain: string;
  userId: string;
  projectId?: string;
  years?: number;
  autoRenew?: boolean;
}): Promise<{ success: boolean; domain: Domain; orderId: string }> => {
  const response = await fetchWithRetry(`${API_BASE}/api/domains/purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to purchase domain');
  }

  return response.json();
};

export const listUserDomains = async (userId: string): Promise<{ domains: Domain[] }> => {
  const response = await fetchWithRetry(`${API_BASE}/api/domains/list?userId=${userId}`);

  if (!response.ok) {
    throw new Error('Failed to list domains');
  }

  return response.json();
};

export const getDomainDetails = async (domainId: string): Promise<{ domain: Domain }> => {
  const response = await fetchWithRetry(`${API_BASE}/api/domains/${domainId}`);

  if (!response.ok) {
    throw new Error('Failed to get domain details');
  }

  return response.json();
};

export const configureDNS = async (
  domainId: string,
  records: DNSRecord[]
): Promise<{ success: boolean; records: DNSRecord[] }> => {
  const response = await fetchWithRetry(`${API_BASE}/api/domains/${domainId}/configure-dns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ records }),
  });

  if (!response.ok) {
    throw new Error('Failed to configure DNS');
  }

  return response.json();
};

export const enableSSL = async (
  domainId: string,
  provider: string = 'letsencrypt'
): Promise<{ success: boolean; ssl_enabled: boolean; provider: string }> => {
  const response = await fetchWithRetry(`${API_BASE}/api/domains/${domainId}/enable-ssl`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ provider }),
  });

  if (!response.ok) {
    throw new Error('Failed to enable SSL');
  }

  return response.json();
};

export const deleteDomain = async (domainId: string): Promise<{ success: boolean }> => {
  const response = await fetchWithRetry(`${API_BASE}/api/domains/${domainId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete domain');
  }

  return response.json();
};

export const getDomainCheckHistory = async (
  userId: string,
  limit: number = 20
): Promise<{ checks: any[] }> => {
  const response = await fetchWithRetry(`${API_BASE}/api/domains/history?userId=${userId}&limit=${limit}`);

  if (!response.ok) {
    throw new Error('Failed to get domain check history');
  }

  return response.json();
};
