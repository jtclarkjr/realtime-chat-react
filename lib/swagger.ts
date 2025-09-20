import swaggerJSDoc from 'swagger-jsdoc'

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Realtime Chat API',
      version: '1.0.0',
      description:
        'A real-time chat application API with messaging, rooms, and AI assistance'
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        description:
          process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Room: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            content: { type: 'string' },
            roomId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            isAI: { type: 'boolean' },
            isPrivate: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        CreateRoomRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' }
          }
        },
        SendMessageRequest: {
          type: 'object',
          required: ['roomId', 'userId', 'username', 'content'],
          properties: {
            roomId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            content: { type: 'string', minLength: 1 },
            isPrivate: { type: 'boolean', default: false }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: ['./app/api/**/*.ts'] // Path to the API files
}

export const swaggerSpec = swaggerJSDoc(options)
