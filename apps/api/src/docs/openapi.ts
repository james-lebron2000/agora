/**
 * OpenAPI 3.0 Configuration for Agora API Gateway
 * @module docs/openapi
 */

import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Agora API Gateway',
    description: `Agora API Gateway provides a unified interface for managing AI agents, tasks, payments, and real-time communication.
    
## Authentication

The API supports two authentication methods:

### 1. API Key Authentication
Include your API key in the request header:
\`\`\`
X-API-Key: your_api_key_here
\`\`\`

### 2. JWT Bearer Token
Exchange your API key for a JWT token at \`/auth/token\`, then use:
\`\`\`
Authorization: Bearer your_jwt_token_here
\`\`\`

## Rate Limiting

Rate limits are applied based on your API key tier:
- **Default**: 100 requests per 15 minutes
- **Premium**: 1000 requests per 15 minutes
- **Internal**: Unlimited

## WebSocket

Real-time updates are available via WebSocket at \`/ws\``,
    version: '1.0.0',
    contact: {
      name: 'Agora Support',
      email: 'support@agora.dev',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
    {
      url: 'https://api.agora.dev',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'API key and token management',
    },
    {
      name: 'Agents',
      description: 'AI agent management and execution',
    },
    {
      name: 'Tasks',
      description: 'Task creation and management',
    },
    {
      name: 'Payments',
      description: 'Payment processing and billing',
    },
    {
      name: 'Health',
      description: 'Health checks and monitoring',
    },
    {
      name: 'Bridge',
      description: 'Cross-chain bridge operations',
    },
    {
      name: 'Survival',
      description: 'Survival game mechanics',
    },
    {
      name: 'Profiles',
      description: 'User profile management',
    },
    {
      name: 'Notifications',
      description: 'Push notification management',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for authentication',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/token',
      },
    },
    schemas: {
      // Response wrappers
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            description: 'Response data',
          },
          meta: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
                example: 1,
              },
              limit: {
                type: 'integer',
                example: 10,
              },
              total: {
                type: 'integer',
                example: 100,
              },
              hasMore: {
                type: 'boolean',
                example: true,
              },
            },
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00.000Z',
          },
          requestId: {
            type: 'string',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
        },
        required: ['success', 'timestamp', 'requestId'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR',
              },
              message: {
                type: 'string',
                example: 'Invalid request data',
              },
              details: {
                type: 'object',
                description: 'Additional error details',
              },
              stack: {
                type: 'string',
                description: 'Stack trace (development only)',
              },
            },
            required: ['code', 'message'],
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          requestId: {
            type: 'string',
          },
        },
        required: ['success', 'error', 'timestamp', 'requestId'],
      },
      // Authentication
      TokenRequest: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'Your API key',
            example: 'agora_demo_api_key_12345',
          },
        },
        required: ['apiKey'],
      },
      TokenResponse: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'JWT access token',
            example: 'eyJhbGciOiJIUzI1NiIs...',
          },
          expiresIn: {
            type: 'string',
            description: 'Token expiration time',
            example: '1h',
          },
        },
        required: ['token', 'expiresIn'],
      },
      UserInfo: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'demo-user',
          },
          tier: {
            type: 'string',
            enum: ['default', 'premium', 'internal'],
            example: 'premium',
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string',
            },
            example: ['agents:read', 'agents:write'],
          },
        },
        required: ['id', 'tier', 'permissions'],
      },
      // Agents
      Agent: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'agent-1',
          },
          name: {
            type: 'string',
            example: 'Assistant Alpha',
          },
          description: {
            type: 'string',
            example: 'A helpful AI assistant',
          },
          type: {
            type: 'string',
            enum: ['chat', 'task', 'workflow'],
            example: 'chat',
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'paused'],
            example: 'active',
          },
          config: {
            type: 'object',
            description: 'Agent-specific configuration',
            example: { model: 'gpt-4' },
          },
          capabilities: {
            type: 'array',
            items: {
              type: 'string',
            },
            example: ['text-generation', 'summarization'],
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['id', 'name', 'type', 'status', 'createdAt'],
      },
      CreateAgentRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            example: 'My Agent',
          },
          description: {
            type: 'string',
            example: 'An agent for specific tasks',
          },
          type: {
            type: 'string',
            enum: ['chat', 'task', 'workflow'],
            example: 'chat',
          },
          config: {
            type: 'object',
            description: 'Agent configuration',
          },
          capabilities: {
            type: 'array',
            items: {
              type: 'string',
            },
            example: ['text-generation'],
          },
        },
        required: ['name', 'type'],
      },
      UpdateAgentRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
          },
          description: {
            type: 'string',
          },
          config: {
            type: 'object',
          },
          capabilities: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'paused'],
          },
        },
      },
      AgentExecution: {
        type: 'object',
        properties: {
          executionId: {
            type: 'string',
            example: 'exec-1234567890',
          },
          agentId: {
            type: 'string',
            example: 'agent-1',
          },
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed'],
            example: 'pending',
          },
          input: {
            type: 'object',
            description: 'Execution input data',
          },
          context: {
            type: 'object',
            description: 'Execution context',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['executionId', 'agentId', 'status', 'createdAt'],
      },
      // Health
      HealthStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
            example: 'healthy',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          version: {
            type: 'string',
            example: '1.0.0',
          },
          uptime: {
            type: 'number',
            description: 'Server uptime in seconds',
            example: 3600,
          },
          dependencies: {
            type: 'object',
            properties: {
              redis: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy'],
                  },
                  latencyMs: {
                    type: 'number',
                    example: 5,
                  },
                },
              },
              agents: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy'],
                  },
                  latencyMs: {
                    type: 'number',
                  },
                },
              },
              tasks: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy'],
                  },
                  latencyMs: {
                    type: 'number',
                  },
                },
              },
              payments: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy'],
                  },
                  latencyMs: {
                    type: 'number',
                  },
                },
              },
            },
          },
        },
        required: ['status', 'timestamp', 'version', 'uptime', 'dependencies'],
      },
      // Tasks
      Task: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'task-1',
          },
          title: {
            type: 'string',
            example: 'Process user request',
          },
          description: {
            type: 'string',
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
            example: 'pending',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            example: 'medium',
          },
          assignedTo: {
            type: 'string',
            description: 'Agent ID assigned to this task',
          },
          metadata: {
            type: 'object',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
          completedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['id', 'title', 'status', 'priority', 'createdAt'],
      },
      // WebSocket
      WebSocketStats: {
        type: 'object',
        properties: {
          totalConnections: {
            type: 'integer',
            example: 42,
          },
          authenticatedConnections: {
            type: 'integer',
            example: 35,
          },
          messagesReceived: {
            type: 'integer',
            example: 1250,
          },
          messagesSent: {
            type: 'integer',
            example: 1300,
          },
        },
        required: ['totalConnections', 'authenticatedConnections', 'messagesReceived', 'messagesSent'],
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        schema: {
          type: 'integer',
          default: 1,
          minimum: 1,
        },
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        schema: {
          type: 'integer',
          default: 10,
          minimum: 1,
          maximum: 100,
        },
      },
      RequestIdHeader: {
        name: 'X-Request-ID',
        in: 'header',
        description: 'Unique request identifier for tracing',
        schema: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
              },
              timestamp: '2024-01-15T10:30:00.000Z',
              requestId: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
              },
              timestamp: '2024-01-15T10:30:00.000Z',
              requestId: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Access denied',
              },
              timestamp: '2024-01-15T10:30:00.000Z',
              requestId: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
      },
      NotFound: {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Resource not found',
              },
              timestamp: '2024-01-15T10:30:00.000Z',
              requestId: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
      },
      TooManyRequests: {
        description: 'Too Many Requests',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Rate limit exceeded. Try again in 60 seconds.',
              },
              timestamp: '2024-01-15T10:30:00.000Z',
              requestId: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
      },
      InternalError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
              },
              timestamp: '2024-01-15T10:30:00.000Z',
              requestId: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
      },
    },
  },
  paths: {}, // Will be populated by route documentation
};

/**
 * Setup Swagger UI middleware
 * @param app Express application instance
 */
export function setupSwagger(app: Express): void {
  // Swagger UI options
  const swaggerOptions = {
    explorer: true,
    customSiteTitle: 'Agora API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
      displayRequestDuration: true,
      filter: true,
    },
  };

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));

  // Serve OpenAPI spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiSpec);
  });
}

export default openApiSpec;
