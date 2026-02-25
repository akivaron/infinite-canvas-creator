import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Canvas Platform API',
      version: version || '1.0.0',
      description: `
# AI Canvas Platform API Documentation

Complete API documentation for the AI Canvas Platform - a visual development environment with AI assistance, deployment capabilities, and real-time collaboration.

## Features

- **AI Code Agent**: Cursor-like AI assistant for code generation and editing
- **RAG System**: Retrieval-Augmented Generation for context-aware responses
- **Sandbox Execution**: Safe code execution environment
- **Mobile Simulator**: Test mobile interfaces
- **Database Sandbox**: Isolated database environments
- **Deployment System**: Deploy web apps, APIs, and databases with container isolation
- **Project Management**: Full CRUD operations for projects
- **Advanced Features**: Symbol resolution, refactoring, AST analysis

## Authentication

All endpoints require authentication unless specified otherwise. Include your API key or session token in the Authorization header:

\`\`\`
Authorization: Bearer YOUR_TOKEN
\`\`\`

## Rate Limiting

API requests are limited to:
- Free tier: 100 requests/hour
- Starter: 1000 requests/hour
- Pro: 10000 requests/hour
- Enterprise: Unlimited

## Error Handling

All errors follow this format:

\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
\`\`\`

## WebSocket Real-Time Communication

The platform provides WebSocket support for real-time notifications:

**WebSocket URL:** \`ws://localhost:3001/ws\`

### Connection Parameters
- \`userId\` (optional): User identifier
- \`sessionId\` (optional): Session identifier

### Event Types
- \`ai_start\` - AI processing started
- \`ai_progress\` - Progress updates during processing
- \`ai_complete\` - AI processing completed
- \`ai_error\` - Error occurred during processing
- \`ping/pong\` - Heartbeat messages

### Example Connection
\`\`\`javascript
const ws = new WebSocket('ws://localhost:3001/ws?sessionId=my_session');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'ai_complete') {
    console.log('AI completed:', message.result);
  }
};
\`\`\`

For complete WebSocket documentation, see [WEBSOCKET_DOCUMENTATION.md](./WEBSOCKET_DOCUMENTATION.md)

## Support

For support, email support@aicanvas.com or visit our documentation at https://docs.aicanvas.com
      `.trim(),
      contact: {
        name: 'API Support',
        email: 'support@aicanvas.com',
        url: 'https://aicanvas.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.aicanvas.com',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Agent',
        description: 'AI code agent operations - Cursor-like AI assistant'
      },
      {
        name: 'RAG',
        description: 'Retrieval-Augmented Generation system'
      },
      {
        name: 'Projects',
        description: 'Project management operations'
      },
      {
        name: 'Sandbox',
        description: 'Code execution sandbox'
      },
      {
        name: 'Mobile',
        description: 'Mobile device simulator'
      },
      {
        name: 'Database',
        description: 'Database sandbox operations'
      },
      {
        name: 'Deployment',
        description: 'Deployment and hosting operations'
      },
      {
        name: 'Advanced',
        description: 'Advanced code analysis features'
      },
      {
        name: 'WebSocket',
        description: 'WebSocket connection management and statistics'
      },
      {
        name: 'Domains',
        description: 'Domain registration and management'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string'
            },
            description: {
              type: 'string'
            },
            user_id: {
              type: 'string',
              format: 'uuid'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Deployment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            user_id: {
              type: 'string',
              format: 'uuid'
            },
            project_id: {
              type: 'string',
              format: 'uuid'
            },
            deployment_type: {
              type: 'string',
              enum: ['web', 'api', 'database']
            },
            status: {
              type: 'string',
              enum: ['pending', 'building', 'running', 'stopped', 'failed', 'deleted']
            },
            subdomain: {
              type: 'string'
            },
            port: {
              type: 'integer'
            },
            container_id: {
              type: 'string'
            },
            build_logs: {
              type: 'string'
            },
            deployed_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        HostingPlan: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string'
            },
            description: {
              type: 'string'
            },
            price_monthly: {
              type: 'number',
              format: 'decimal'
            },
            price_yearly: {
              type: 'number',
              format: 'decimal'
            },
            storage_gb: {
              type: 'integer'
            },
            bandwidth_gb: {
              type: 'integer'
            },
            databases: {
              type: 'integer'
            },
            apis: {
              type: 'integer'
            },
            websites: {
              type: 'integer'
            },
            custom_domain: {
              type: 'boolean'
            },
            ssl_certificate: {
              type: 'boolean'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/index.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
