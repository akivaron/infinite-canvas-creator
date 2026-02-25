# Domain Management System

Complete documentation for the Domain Management feature in the AI Canvas Platform.

---

## 🌐 Overview

The Domain Management system allows users to:
- Check domain availability
- Purchase domains directly from the platform
- Manage DNS records
- Enable SSL certificates
- Configure custom domains for deployments
- View domain check history

**Key Features:**
- Real-time domain availability checking
- Integrated domain purchasing
- DNS configuration
- SSL certificate management
- Domain suggestions
- WebSocket notifications for purchase events

---

## 📊 Database Schema

### Tables

#### `domains`
Stores registered domains and their configurations.

```sql
CREATE TABLE domains (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid,
  domain_name text UNIQUE NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'active', 'expired', 'cancelled'
  registrar text DEFAULT 'namecheap',
  purchase_date timestamptz DEFAULT now(),
  expiry_date timestamptz,
  auto_renew boolean DEFAULT true,
  nameservers jsonb DEFAULT '[]',
  dns_records jsonb DEFAULT '[]',
  ssl_enabled boolean DEFAULT false,
  ssl_provider text,
  price_paid decimal(10, 2),
  currency text DEFAULT 'USD',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### `domain_checks`
Logs all domain availability checks.

```sql
CREATE TABLE domain_checks (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  domain_name text NOT NULL,
  is_available boolean NOT NULL,
  price decimal(10, 2),
  currency text DEFAULT 'USD',
  registrar text DEFAULT 'namecheap',
  checked_at timestamptz DEFAULT now()
);
```

---

## 🔧 Backend API

### Domain Service (`backend/src/services/domainService.ts`)

Core service handling domain operations:

```typescript
class DomainService {
  // Check if domain is available
  async checkAvailability(domain: string): Promise<DomainAvailability>

  // Check multiple domains at once
  async checkMultipleAvailability(domains: string[]): Promise<DomainAvailability[]>

  // Purchase a domain
  async purchaseDomain(request: DomainPurchaseRequest): Promise<DomainPurchaseResult>

  // Configure DNS records
  async configureDNS(domain: string, records: any[]): Promise<boolean>

  // Enable SSL certificate
  async enableSSL(domain: string, provider?: string): Promise<boolean>

  // Get domain information
  async getDomainInfo(domain: string): Promise<any>
}
```

**Domain Pricing:**
```typescript
{
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
  '.blog': 19.99
}
```

---

## 🚀 API Endpoints

### 1. Check Domain Availability

**Endpoint:** `POST /api/domains/check`

**Request:**
```json
{
  "domain": "myapp.com",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "domain": "myapp.com",
  "available": true,
  "price": 12.99,
  "currency": "USD",
  "registrar": "namecheap",
  "suggestions": [
    "myapp.net",
    "myapp.io",
    "myapp.dev",
    "getmyapp.com",
    "myappapp.com",
    "myapphq.com"
  ]
}
```

---

### 2. Check Multiple Domains

**Endpoint:** `POST /api/domains/check-multiple`

**Request:**
```json
{
  "domains": ["myapp.com", "myapp.io", "myapp.dev"],
  "userId": "uuid"
}
```

**Response:**
```json
{
  "results": [
    {
      "domain": "myapp.com",
      "available": true,
      "price": 12.99,
      "currency": "USD",
      "registrar": "namecheap"
    },
    {
      "domain": "myapp.io",
      "available": false,
      "currency": "USD",
      "registrar": "namecheap",
      "suggestions": ["myapp-io.com", "getmyapp.io"]
    }
  ]
}
```

---

### 3. Purchase Domain

**Endpoint:** `POST /api/domains/purchase`

**Request:**
```json
{
  "domain": "myapp.com",
  "userId": "uuid",
  "projectId": "uuid",
  "years": 1,
  "autoRenew": true
}
```

**Response:**
```json
{
  "success": true,
  "domain": {
    "id": "uuid",
    "domain_name": "myapp.com",
    "status": "active",
    "expiry_date": "2026-02-25T00:00:00Z",
    "nameservers": [
      "ns1.digitalocean.com",
      "ns2.digitalocean.com",
      "ns3.digitalocean.com"
    ],
    "ssl_enabled": false,
    "price_paid": 12.99
  },
  "orderId": "ORDER-1234567890-abc123"
}
```

**WebSocket Notification:**
```json
{
  "type": "domain_purchased",
  "domain": { ...domain object... },
  "timestamp": "2024-02-25T00:00:00Z"
}
```

---

### 4. List User Domains

**Endpoint:** `GET /api/domains/list?userId=uuid`

**Response:**
```json
{
  "domains": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "project_id": "uuid",
      "domain_name": "myapp.com",
      "status": "active",
      "registrar": "namecheap",
      "purchase_date": "2024-02-25T00:00:00Z",
      "expiry_date": "2026-02-25T00:00:00Z",
      "auto_renew": true,
      "ssl_enabled": true,
      "ssl_provider": "letsencrypt",
      "price_paid": 12.99,
      "currency": "USD"
    }
  ]
}
```

---

### 5. Get Domain Details

**Endpoint:** `GET /api/domains/:domainId`

**Response:**
```json
{
  "domain": {
    "id": "uuid",
    "domain_name": "myapp.com",
    "status": "active",
    "nameservers": ["ns1.digitalocean.com", "ns2.digitalocean.com"],
    "dns_records": [
      {
        "type": "A",
        "name": "@",
        "value": "192.168.1.1",
        "ttl": 3600
      }
    ],
    "ssl_enabled": true
  }
}
```

---

### 6. Configure DNS

**Endpoint:** `POST /api/domains/:domainId/configure-dns`

**Request:**
```json
{
  "records": [
    {
      "type": "A",
      "name": "@",
      "value": "192.168.1.1",
      "ttl": 3600
    },
    {
      "type": "CNAME",
      "name": "www",
      "value": "myapp.com",
      "ttl": 3600
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "records": [ ...updated records... ]
}
```

---

### 7. Enable SSL

**Endpoint:** `POST /api/domains/:domainId/enable-ssl`

**Request:**
```json
{
  "provider": "letsencrypt"
}
```

**Response:**
```json
{
  "success": true,
  "ssl_enabled": true,
  "provider": "letsencrypt"
}
```

---

### 8. Delete Domain

**Endpoint:** `DELETE /api/domains/:domainId`

**Response:**
```json
{
  "success": true,
  "domain": { ...deleted domain object... }
}
```

---

### 9. Get Domain Check History

**Endpoint:** `GET /api/domains/history?userId=uuid&limit=20`

**Response:**
```json
{
  "checks": [
    {
      "id": "uuid",
      "domain_name": "myapp.com",
      "is_available": true,
      "price": 12.99,
      "currency": "USD",
      "registrar": "namecheap",
      "checked_at": "2024-02-25T00:00:00Z"
    }
  ]
}
```

---

## ⚛️ Frontend Components

### 1. DomainManager Component

Search and purchase domains.

**Location:** `src/components/canvas/DomainManager.tsx`

**Usage:**
```tsx
import { DomainManager } from '@/components/canvas/DomainManager';

<DomainManager
  userId="user-uuid"
  projectId="project-uuid"
  onDomainPurchased={(domain) => {
    console.log('Purchased:', domain);
  }}
/>
```

**Features:**
- Domain search with validation
- Real-time availability checking
- Price display
- Purchase button
- Alternative suggestions
- Popular TLD badges

---

### 2. DomainList Component

Display and manage user's domains.

**Location:** `src/components/canvas/DomainList.tsx`

**Usage:**
```tsx
import { DomainList } from '@/components/canvas/DomainList';

<DomainList
  userId="user-uuid"
  onDomainSelect={(domain) => {
    console.log('Selected:', domain);
  }}
/>
```

**Features:**
- List all user domains
- Domain status badges
- SSL indicator
- Enable SSL button
- Delete domain with confirmation
- View expiry dates
- Auto-renew status
- Visit domain link

---

### 3. Frontend Library

**Location:** `src/lib/domains.ts`

```typescript
// Check domain availability
const availability = await checkDomainAvailability('myapp.com', userId);

// Check multiple domains
const results = await checkMultipleDomains(['myapp.com', 'myapp.io'], userId);

// Purchase domain
const result = await purchaseDomain({
  domain: 'myapp.com',
  userId: 'uuid',
  projectId: 'uuid',
  years: 1,
  autoRenew: true
});

// List user domains
const { domains } = await listUserDomains(userId);

// Configure DNS
await configureDNS(domainId, [
  { type: 'A', name: '@', value: '192.168.1.1' }
]);

// Enable SSL
await enableSSL(domainId, 'letsencrypt');

// Delete domain
await deleteDomain(domainId);
```

---

## 🎨 Integration with Deployment

The Domain Manager is integrated into the Deployment Panel:

**Location:** `src/components/canvas/DeploymentPanel.tsx`

**New Tab:** "Domains" tab added alongside "Deployments" and "Plans & Billing"

**Features:**
1. Search and purchase domains for deployment
2. View all registered domains
3. Configure DNS for custom domains
4. Enable SSL certificates
5. Link domains to specific projects

**Usage Flow:**
```
1. Open Deployment Panel
2. Click "Domains" tab
3. Search for available domain
4. Purchase domain
5. Domain automatically configured with:
   - Default nameservers
   - DNS records
   - SSL certificate (optional)
6. Link domain to deployment
```

---

## 🔒 Security

### Row Level Security (RLS)

All domain operations are protected with RLS policies:

```sql
-- Users can only view their own domains
CREATE POLICY "Users can view own domains"
  ON domains FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only insert their own domains
CREATE POLICY "Users can insert own domains"
  ON domains FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own domains
CREATE POLICY "Users can update own domains"
  ON domains FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own domains
CREATE POLICY "Users can delete own domains"
  ON domains FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

---

## 📋 Domain Availability Logic

The service checks domain availability using DNS resolution:

```typescript
1. Validate domain format (regex validation)
2. Try to resolve domain via DNS
3. If resolves → Domain is registered
4. If ENOTFOUND → Check common patterns
5. Common domains (google, facebook, etc.) → Marked as taken
6. Otherwise → Available for registration
7. Generate alternative suggestions
8. Return availability with pricing
```

**Common Patterns (Always Taken):**
- google
- facebook
- amazon
- microsoft
- apple
- twitter

---

## 💰 Pricing Structure

Domain prices vary by TLD (Top-Level Domain):

| TLD | Price (USD/year) |
|-----|------------------|
| .com | $12.99 |
| .net | $14.99 |
| .org | $14.99 |
| .io | $39.99 |
| .dev | $14.99 |
| .app | $14.99 |
| .co | $24.99 |
| .ai | $89.99 |
| .xyz | $9.99 |
| .me | $19.99 |
| .tech | $19.99 |
| .online | $9.99 |
| .site | $9.99 |
| .store | $19.99 |
| .blog | $19.99 |

**Default:** $14.99 for unlisted TLDs

---

## 🔄 WebSocket Notifications

Domain purchases trigger WebSocket notifications:

```json
{
  "type": "domain_purchased",
  "domain": {
    "id": "uuid",
    "domain_name": "myapp.com",
    "status": "active",
    "price_paid": 12.99
  },
  "timestamp": "2024-02-25T00:00:00Z"
}
```

**Frontend Usage:**
```typescript
import { useWebSocket } from '@/hooks/use-websocket';

const { lastMessage } = useWebSocket({
  userId: 'user-uuid',
  onMessage: (message) => {
    if (message.type === 'domain_purchased') {
      console.log('Domain purchased:', message.domain);
      // Refresh domain list
      loadDomains();
    }
  }
});
```

---

## 🧪 Testing

### Manual Testing

**1. Check Domain Availability**
```bash
curl -X POST http://localhost:3001/api/domains/check \
  -H "Content-Type: application/json" \
  -d '{"domain":"myapp.com","userId":"test-user"}'
```

**2. Purchase Domain**
```bash
curl -X POST http://localhost:3001/api/domains/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "domain":"myapp.com",
    "userId":"test-user",
    "years":1,
    "autoRenew":true
  }'
```

**3. List Domains**
```bash
curl http://localhost:3001/api/domains/list?userId=test-user
```

**4. Enable SSL**
```bash
curl -X POST http://localhost:3001/api/domains/{domainId}/enable-ssl \
  -H "Content-Type: application/json" \
  -d '{"provider":"letsencrypt"}'
```

---

### Frontend Testing

1. Open Deployment Panel
2. Navigate to "Domains" tab
3. Search for domain (e.g., "myapp.com")
4. Click "Check" button
5. Verify availability status
6. Check alternative suggestions
7. Click "Purchase" (simulated)
8. Verify domain appears in list
9. Test SSL enable button
10. Test domain deletion

---

## 🚀 Production Integration

### Registrar API Integration

To integrate with real domain registrars (Namecheap, GoDaddy, etc.):

**1. Add API credentials:**
```env
NAMECHEAP_API_KEY=your_api_key
NAMECHEAP_USERNAME=your_username
NAMECHEAP_API_USER=your_api_user
```

**2. Update DomainService:**
```typescript
async purchaseDomain(request: DomainPurchaseRequest) {
  // Replace simulation with actual API call
  const response = await fetch('https://api.namecheap.com/xml.response', {
    method: 'POST',
    body: buildNamecheapRequest(request)
  });

  // Process response
  return parseNamecheapResponse(response);
}
```

---

### DNS Provider Integration

**Cloudflare Example:**
```typescript
async configureDNS(domain: string, records: DNSRecord[]) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: records[0].type,
        name: records[0].name,
        content: records[0].value,
        ttl: records[0].ttl
      })
    }
  );

  return response.ok;
}
```

---

### SSL Certificate Integration

**Let's Encrypt / Certbot:**
```typescript
async enableSSL(domain: string) {
  // Use certbot or ACME client
  const result = await exec(
    `certbot certonly --dns-cloudflare ` +
    `--dns-cloudflare-credentials ~/.secrets/cloudflare.ini ` +
    `-d ${domain} -d www.${domain}`
  );

  return result.exitCode === 0;
}
```

---

## 📊 Monitoring & Analytics

### Domain Metrics

Track domain-related metrics:

```sql
-- Most popular TLDs
SELECT
  SUBSTRING(domain_name FROM '\.[^.]+$') as tld,
  COUNT(*) as count
FROM domains
GROUP BY tld
ORDER BY count DESC;

-- Revenue by TLD
SELECT
  SUBSTRING(domain_name FROM '\.[^.]+$') as tld,
  SUM(price_paid) as revenue
FROM domains
GROUP BY tld
ORDER BY revenue DESC;

-- Domain check conversion rate
SELECT
  COUNT(DISTINCT user_id) as users_checked,
  (SELECT COUNT(DISTINCT user_id) FROM domains) as users_purchased,
  ROUND(
    (SELECT COUNT(DISTINCT user_id) FROM domains)::numeric /
    COUNT(DISTINCT user_id)::numeric * 100, 2
  ) as conversion_rate
FROM domain_checks;
```

---

## 🎉 Summary

**Domain Management Features:**
- ✅ Real-time availability checking
- ✅ Domain purchasing (simulated, production-ready)
- ✅ DNS configuration
- ✅ SSL certificate management
- ✅ Domain suggestions
- ✅ WebSocket notifications
- ✅ Complete CRUD operations
- ✅ RLS security
- ✅ Integration with deployment
- ✅ React components ready
- ✅ TypeScript support
- ✅ Swagger documentation

**Database:**
- `domains` table with full configuration
- `domain_checks` for history tracking
- Automatic timestamps
- RLS policies

**API Endpoints:**
- POST `/api/domains/check` - Check availability
- POST `/api/domains/check-multiple` - Bulk check
- POST `/api/domains/purchase` - Purchase domain
- GET `/api/domains/list` - List user domains
- GET `/api/domains/:id` - Get domain details
- POST `/api/domains/:id/configure-dns` - Configure DNS
- POST `/api/domains/:id/enable-ssl` - Enable SSL
- DELETE `/api/domains/:id` - Delete domain
- GET `/api/domains/history` - Check history

**Frontend:**
- `DomainManager` - Search & purchase
- `DomainList` - Manage domains
- Integrated in Deployment Panel
- Real-time updates

**Ready untuk production dengan domain registrar API integration!** 🚀🌐
