// Static OpenAPI specification - works in both development and production
export const swaggerSpec = {
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
      MarkReceivedRequest: {
        type: 'object',
        required: ['userId', 'roomId', 'messageId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          roomId: { type: 'string', format: 'uuid' },
          messageId: { type: 'string', format: 'uuid' }
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
  ],
  paths: {
    '/api/rooms': {
      get: {
        summary: 'Get all rooms',
        description: 'Retrieve a list of all available chat rooms',
        tags: ['Rooms'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'List of rooms retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rooms: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Room' }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create a new room',
        description:
          'Create a new chat room with a name and optional description',
        tags: ['Rooms'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateRoomRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Room created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    room: { $ref: '#/components/schemas/Room' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          409: {
            description: 'Room with this name already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/messages/send': {
      post: {
        summary: 'Send a message',
        description: 'Send a message to a chat room',
        tags: ['Messages'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SendMessageRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Message sent successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { $ref: '#/components/schemas/Message' }
                  }
                }
              }
            }
          },
          400: {
            description: 'Missing required fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          403: {
            description: 'Cannot send messages as another user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          500: {
            description: 'Failed to send message',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/messages/mark-received': {
      post: {
        summary: 'Mark message as received',
        description: 'Mark a message as received by the current user',
        tags: ['Messages'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MarkReceivedRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Message marked as received successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' }
              }
            }
          },
          400: {
            description: 'Missing required fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          403: {
            description: 'Cannot mark messages for another user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          500: {
            description: 'Failed to mark message as received',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/ai/stream': {
      post: {
        summary: 'Stream AI responses',
        description: 'Stream AI responses from Claude integration',
        tags: ['AI Assistant'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message', 'roomId', 'userId'],
                properties: {
                  message: { type: 'string' },
                  roomId: { type: 'string', format: 'uuid' },
                  userId: { type: 'string', format: 'uuid' },
                  isPrivate: { type: 'boolean', default: false }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'AI response stream',
            content: {
              'text/event-stream': {
                schema: { type: 'string' }
              }
            }
          },
          400: {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          500: {
            description: 'AI service error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    }
  }
}
