import { Router, Request, Response } from 'express';
import { domainService } from '../services/domainService.js';
import db from '../config/database.js';
import { getWebSocketManager } from '../config/websocket.js';

const router = Router();

/**
 * @swagger
 * /api/domains/check:
 *   post:
 *     summary: Check domain availability
 *     description: Check if a domain is available for registration
 *     tags: [Domains]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domain
 *               - userId
 *             properties:
 *               domain:
 *                 type: string
 *                 example: myapp.com
 *               userId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Domain availability result
 *       400:
 *         description: Invalid request
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { domain, userId } = req.body;

    if (!domain || !userId) {
      return res.status(400).json({ error: 'domain and userId are required' });
    }

    const availability = await domainService.checkAvailability(domain);

    // Log the check to database
    await db.query(
      `INSERT INTO domain_checks (user_id, domain_name, is_available, price, currency, registrar)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, domain, availability.available, availability.price || null, availability.currency, availability.registrar]
    );

    res.json(availability);
  } catch (error) {
    console.error('Domain check error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Domain check failed',
    });
  }
});

/**
 * @swagger
 * /api/domains/check-multiple:
 *   post:
 *     summary: Check multiple domains availability
 *     description: Check availability for multiple domains at once
 *     tags: [Domains]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domains
 *               - userId
 *             properties:
 *               domains:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["myapp.com", "myapp.io", "myapp.dev"]
 *               userId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Array of domain availability results
 */
router.post('/check-multiple', async (req: Request, res: Response) => {
  try {
    const { domains, userId } = req.body;

    if (!domains || !Array.isArray(domains) || !userId) {
      return res.status(400).json({ error: 'domains array and userId are required' });
    }

    const results = await domainService.checkMultipleAvailability(domains);

    // Log all checks
    const checkPromises = results.map((result) =>
      db.query(
        `INSERT INTO domain_checks (user_id, domain_name, is_available, price, currency, registrar)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, result.domain, result.available, result.price || null, result.currency, result.registrar]
      )
    );

    await Promise.all(checkPromises);

    res.json({ results });
  } catch (error) {
    console.error('Multiple domain check error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Domain check failed',
    });
  }
});

/**
 * @swagger
 * /api/domains/purchase:
 *   post:
 *     summary: Purchase a domain
 *     description: Purchase an available domain
 *     tags: [Domains]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domain
 *               - userId
 *               - years
 *             properties:
 *               domain:
 *                 type: string
 *                 example: myapp.com
 *               userId:
 *                 type: string
 *                 format: uuid
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               years:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 example: 1
 *               autoRenew:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Domain purchase successful
 *       400:
 *         description: Domain not available or invalid request
 */
router.post('/purchase', async (req: Request, res: Response) => {
  try {
    const { domain, userId, projectId, years = 1, autoRenew = true } = req.body;

    if (!domain || !userId) {
      return res.status(400).json({ error: 'domain and userId are required' });
    }

    // Check availability first
    const availability = await domainService.checkAvailability(domain);

    if (!availability.available) {
      return res.status(400).json({ error: 'Domain is not available' });
    }

    // Purchase domain
    const purchaseResult = await domainService.purchaseDomain({
      domain,
      userId,
      projectId,
      years,
      autoRenew,
    });

    if (!purchaseResult.success) {
      return res.status(400).json({ error: purchaseResult.error });
    }

    // Save to database
    const result = await db.query(
      `INSERT INTO domains (
        user_id, project_id, domain_name, status, registrar,
        purchase_date, expiry_date, auto_renew, nameservers,
        price_paid, currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        projectId || null,
        domain,
        'active',
        'namecheap',
        new Date(),
        purchaseResult.expiryDate,
        autoRenew,
        JSON.stringify(purchaseResult.nameservers || []),
        availability.price,
        availability.currency,
      ]
    );

    const domainRecord = result.rows[0];

    // Notify via WebSocket
    const wsManager = getWebSocketManager();
    if (wsManager) {
      wsManager.broadcastToUser(userId, {
        type: 'domain_purchased',
        domain: domainRecord,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      domain: domainRecord,
      orderId: purchaseResult.orderId,
    });
  } catch (error) {
    console.error('Domain purchase error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Domain purchase failed',
    });
  }
});

/**
 * @swagger
 * /api/domains/list:
 *   get:
 *     summary: List user domains
 *     description: Get all domains owned by user
 *     tags: [Domains]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of user domains
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await db.query(
      `SELECT * FROM domains WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ domains: result.rows });
  } catch (error) {
    console.error('List domains error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list domains',
    });
  }
});

/**
 * @swagger
 * /api/domains/{domainId}:
 *   get:
 *     summary: Get domain details
 *     description: Get detailed information about a specific domain
 *     tags: [Domains]
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Domain details
 *       404:
 *         description: Domain not found
 */
router.get('/:domainId', async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;

    const result = await db.query(`SELECT * FROM domains WHERE id = $1`, [domainId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    res.json({ domain: result.rows[0] });
  } catch (error) {
    console.error('Get domain error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get domain',
    });
  }
});

/**
 * @swagger
 * /api/domains/{domainId}/configure-dns:
 *   post:
 *     summary: Configure DNS records
 *     description: Set up DNS records for a domain
 *     tags: [Domains]
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - records
 *             properties:
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [A, AAAA, CNAME, MX, TXT]
 *                     name:
 *                       type: string
 *                     value:
 *                       type: string
 *                     ttl:
 *                       type: integer
 *     responses:
 *       200:
 *         description: DNS configured successfully
 */
router.post('/:domainId/configure-dns', async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'records array is required' });
    }

    // Get domain
    const domainResult = await db.query(`SELECT * FROM domains WHERE id = $1`, [domainId]);

    if (domainResult.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const domain = domainResult.rows[0];

    // Configure DNS
    const success = await domainService.configureDNS(domain.domain_name, records);

    if (!success) {
      return res.status(500).json({ error: 'DNS configuration failed' });
    }

    // Update database
    await db.query(`UPDATE domains SET dns_records = $1, updated_at = now() WHERE id = $2`, [
      JSON.stringify(records),
      domainId,
    ]);

    res.json({ success: true, records });
  } catch (error) {
    console.error('Configure DNS error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'DNS configuration failed',
    });
  }
});

/**
 * @swagger
 * /api/domains/{domainId}/enable-ssl:
 *   post:
 *     summary: Enable SSL for domain
 *     description: Enable SSL certificate for a domain
 *     tags: [Domains]
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [letsencrypt, cloudflare]
 *                 default: letsencrypt
 *     responses:
 *       200:
 *         description: SSL enabled successfully
 */
router.post('/:domainId/enable-ssl', async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const { provider = 'letsencrypt' } = req.body;

    // Get domain
    const domainResult = await db.query(`SELECT * FROM domains WHERE id = $1`, [domainId]);

    if (domainResult.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const domain = domainResult.rows[0];

    // Enable SSL
    const success = await domainService.enableSSL(domain.domain_name, provider);

    if (!success) {
      return res.status(500).json({ error: 'SSL enablement failed' });
    }

    // Update database
    await db.query(
      `UPDATE domains SET ssl_enabled = true, ssl_provider = $1, updated_at = now() WHERE id = $2`,
      [provider, domainId]
    );

    res.json({ success: true, ssl_enabled: true, provider });
  } catch (error) {
    console.error('Enable SSL error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'SSL enablement failed',
    });
  }
});

/**
 * @swagger
 * /api/domains/{domainId}:
 *   delete:
 *     summary: Delete domain
 *     description: Remove a domain from the system
 *     tags: [Domains]
 *     parameters:
 *       - in: path
 *         name: domainId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Domain deleted successfully
 */
router.delete('/:domainId', async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;

    const result = await db.query(`DELETE FROM domains WHERE id = $1 RETURNING *`, [domainId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    res.json({ success: true, domain: result.rows[0] });
  } catch (error) {
    console.error('Delete domain error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete domain',
    });
  }
});

/**
 * @swagger
 * /api/domains/history:
 *   get:
 *     summary: Get domain check history
 *     description: Get history of domain availability checks for a user
 *     tags: [Domains]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Domain check history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await db.query(
      `SELECT * FROM domain_checks
       WHERE user_id = $1
       ORDER BY checked_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ checks: result.rows });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get history',
    });
  }
});

export default router;
