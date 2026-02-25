import dns from 'dns';
import { promisify } from 'util';

const resolveDns = promisify(dns.resolve);

export interface DomainAvailability {
  domain: string;
  available: boolean;
  price?: number;
  currency: string;
  registrar: string;
  suggestions?: string[];
  error?: string;
}

export interface DomainPurchaseRequest {
  domain: string;
  years: number;
  userId: string;
  projectId?: string;
  autoRenew?: boolean;
}

export interface DomainPurchaseResult {
  success: boolean;
  domain: string;
  orderId?: string;
  expiryDate?: Date;
  nameservers?: string[];
  error?: string;
}

export class DomainService {
  private readonly PRICE_MAP: Record<string, number> = {
    '.com': 12.99,
    '.net': 14.99,
    '.org': 14.99,
    '.io': 39.99,
    '.dev': 14.99,
    '.app': 14.99,
    '.co': 24.99,
    '.ai': 89.99,
    '.xyz': 9.99,
    '.me': 19.99,
    '.tech': 19.99,
    '.online': 9.99,
    '.site': 9.99,
    '.store': 19.99,
    '.blog': 19.99,
  };

  private readonly DEFAULT_NAMESERVERS = [
    'ns1.digitalocean.com',
    'ns2.digitalocean.com',
    'ns3.digitalocean.com',
  ];

  /**
   * Check if domain is available for registration
   */
  async checkAvailability(domain: string): Promise<DomainAvailability> {
    try {
      // Validate domain format
      if (!this.isValidDomain(domain)) {
        return {
          domain,
          available: false,
          currency: 'USD',
          registrar: 'namecheap',
          error: 'Invalid domain format',
        };
      }

      // Check if domain is already registered by checking DNS
      const isRegistered = await this.isDomainRegistered(domain);

      if (isRegistered) {
        const suggestions = this.generateSuggestions(domain);
        return {
          domain,
          available: false,
          currency: 'USD',
          registrar: 'namecheap',
          suggestions,
        };
      }

      // Domain is available
      const price = this.getDomainPrice(domain);
      const suggestions = this.generateSuggestions(domain);

      return {
        domain,
        available: true,
        price,
        currency: 'USD',
        registrar: 'namecheap',
        suggestions,
      };
    } catch (error) {
      console.error('Domain availability check error:', error);
      return {
        domain,
        available: false,
        currency: 'USD',
        registrar: 'namecheap',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check multiple domains at once
   */
  async checkMultipleAvailability(domains: string[]): Promise<DomainAvailability[]> {
    const promises = domains.map((domain) => this.checkAvailability(domain));
    return Promise.all(promises);
  }

  /**
   * Simulate domain purchase (In production, integrate with registrar API)
   */
  async purchaseDomain(request: DomainPurchaseRequest): Promise<DomainPurchaseResult> {
    try {
      // First check if domain is available
      const availability = await this.checkAvailability(request.domain);

      if (!availability.available) {
        return {
          success: false,
          domain: request.domain,
          error: 'Domain is not available',
        };
      }

      // In production, this would call Namecheap/GoDaddy API
      // For now, we simulate the purchase
      const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + request.years);

      return {
        success: true,
        domain: request.domain,
        orderId,
        expiryDate,
        nameservers: this.DEFAULT_NAMESERVERS,
      };
    } catch (error) {
      console.error('Domain purchase error:', error);
      return {
        success: false,
        domain: request.domain,
        error: error instanceof Error ? error.message : 'Purchase failed',
      };
    }
  }

  /**
   * Configure DNS records for a domain
   */
  async configureDNS(domain: string, records: any[]): Promise<boolean> {
    try {
      // In production, this would call DNS provider API (Cloudflare, Route53, etc.)
      console.log(`Configuring DNS for ${domain}:`, records);

      // Simulate DNS configuration
      await this.delay(1000);

      return true;
    } catch (error) {
      console.error('DNS configuration error:', error);
      return false;
    }
  }

  /**
   * Enable SSL for domain
   */
  async enableSSL(domain: string, provider: string = 'letsencrypt'): Promise<boolean> {
    try {
      // In production, this would integrate with SSL provider
      console.log(`Enabling SSL for ${domain} via ${provider}`);

      // Simulate SSL setup
      await this.delay(2000);

      return true;
    } catch (error) {
      console.error('SSL enablement error:', error);
      return false;
    }
  }

  /**
   * Get domain info from WHOIS (simplified)
   */
  async getDomainInfo(domain: string): Promise<any> {
    try {
      const isRegistered = await this.isDomainRegistered(domain);

      return {
        domain,
        registered: isRegistered,
        checkedAt: new Date(),
      };
    } catch (error) {
      console.error('Domain info error:', error);
      return null;
    }
  }

  /**
   * Private helper methods
   */

  private isValidDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    return domainRegex.test(domain);
  }

  private async isDomainRegistered(domain: string): Promise<boolean> {
    try {
      // Try to resolve domain - if it resolves, it's registered
      await resolveDns(domain, 'A');
      return true;
    } catch (error: any) {
      // ENOTFOUND means domain doesn't resolve (not registered or no DNS)
      // We'll consider common domains as taken, new domains as available
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        // Check if it's a common pattern that's likely taken
        const commonPatterns = ['google', 'facebook', 'amazon', 'microsoft', 'apple', 'twitter'];
        const domainLower = domain.toLowerCase();
        const isTaken = commonPatterns.some((pattern) => domainLower.includes(pattern));
        return isTaken;
      }
      return false;
    }
  }

  private getDomainPrice(domain: string): number {
    const tld = this.extractTLD(domain);
    return this.PRICE_MAP[tld] || 14.99;
  }

  private extractTLD(domain: string): string {
    const parts = domain.split('.');
    if (parts.length < 2) return '.com';
    return '.' + parts[parts.length - 1];
  }

  private generateSuggestions(domain: string): string[] {
    const baseName = domain.split('.')[0];
    const suggestions: string[] = [];

    // Add different TLDs
    const tlds = ['.com', '.net', '.io', '.dev', '.app', '.co', '.org'];
    tlds.forEach((tld) => {
      const suggestion = baseName + tld;
      if (suggestion !== domain) {
        suggestions.push(suggestion);
      }
    });

    // Add variations
    const variations = [
      `get${baseName}.com`,
      `${baseName}app.com`,
      `${baseName}hq.com`,
      `my${baseName}.com`,
      `the${baseName}.com`,
    ];

    suggestions.push(...variations);

    return suggestions.slice(0, 6);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const domainService = new DomainService();
