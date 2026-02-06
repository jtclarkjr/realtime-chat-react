// Static OpenAPI specification - works in both development and production
export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Realtime Chat API',
    version: '1.0.0',
    description:
      'A realtime chat API with rooms, messaging, rejoin/missed message recovery, and AI streaming.'
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
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        },
        required: ['error']
      },
      SuccessOnly: {
        type: 'object',
        properties: {
          success: { type: 'boolean' }
        },
        required: ['success']
      },
      Room: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          created_by: { type: 'string', format: 'uuid', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'created_at', 'updated_at']
      },
      ChatUser: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          avatar_url: { type: 'string', nullable: true }
        },
        required: ['name']
      },
      ChatMessage: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          content: { type: 'string' },
          user: { $ref: '#/components/schemas/ChatUser' },
          createdAt: { type: 'string', format: 'date-time' },
          channelId: { type: 'string', format: 'uuid' },
          isAI: { type: 'boolean' },
          isPrivate: { type: 'boolean' },
          requesterId: { type: 'string', format: 'uuid', nullable: true },
          isDeleted: { type: 'boolean' },
          deletedAt: { type: 'string', format: 'date-time', nullable: true },
          deletedBy: { type: 'string', format: 'uuid', nullable: true },
          hasAIResponse: { type: 'boolean' }
        },
        required: ['id', 'content', 'user', 'createdAt', 'channelId']
      },
      CreateRoomRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', nullable: true, maxLength: 500 }
        }
      },
      SendMessageRequest: {
        type: 'object',
        required: ['roomId', 'userId', 'username', 'content'],
        properties: {
          roomId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          username: { type: 'string', minLength: 1, maxLength: 50 },
          content: { type: 'string', minLength: 1, maxLength: 5000 },
          isPrivate: { type: 'boolean', default: false },
          requesterId: { type: 'string', format: 'uuid' },
          optimisticId: { type: 'string', format: 'uuid' }
        }
      },
      UnsendMessageRequest: {
        type: 'object',
        required: ['messageId', 'userId', 'roomId'],
        properties: {
          messageId: { type: 'string' },
          userId: { type: 'string', format: 'uuid' },
          roomId: { type: 'string', format: 'uuid' }
        }
      },
      MarkReceivedRequest: {
        type: 'object',
        required: ['userId', 'roomId', 'messageId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          roomId: { type: 'string', format: 'uuid' },
          messageId: { type: 'string' }
        }
      },
      RejoinRequest: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' }
        }
      },
      MissedMessagesResponse: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['missed_messages', 'caught_up', 'recent_messages']
          },
          messages: {
            type: 'array',
            items: { $ref: '#/components/schemas/ChatMessage' }
          },
          count: { type: 'integer' }
        },
        required: ['type', 'messages', 'count']
      },
      GenerateRoomRequest: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          existingRoomNames: {
            type: 'array',
            items: { type: 'string' }
          },
          currentName: { type: 'string' },
          currentDescription: { type: 'string' }
        }
      },
      GenerateRoomResponse: {
        type: 'object',
        properties: {
          suggestion: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' }
            },
            required: ['name', 'description']
          }
        },
        required: ['suggestion']
      },
      AIStreamRequest: {
        type: 'object',
        required: ['message', 'roomId', 'userId'],
        properties: {
          message: { type: 'string', minLength: 1, maxLength: 5000 },
          roomId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          isPrivate: { type: 'boolean', default: false },
          triggerMessageId: { type: 'string' },
          previousMessages: {
            type: 'array',
            maxItems: 50,
            items: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                isAi: { type: 'boolean' },
                userName: { type: 'string' }
              },
              required: ['content', 'isAi', 'userName']
            }
          }
        }
      }
    }
  },
  security: [{ BearerAuth: [] }],
  paths: {
    '/api/rooms': {
      get: {
        summary: 'Get all rooms',
        tags: ['Rooms'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Rooms retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rooms: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Room' }
                    }
                  },
                  required: ['rooms']
                }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      },
      post: {
        summary: 'Create a room',
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
                  },
                  required: ['room']
                }
              }
            }
          },
          400: {
            description: 'Invalid request',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          403: {
            description: 'Forbidden (anonymous users cannot create rooms)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          409: {
            description: 'Room name conflict',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      },
      delete: {
        summary: 'Delete a room',
        tags: ['Rooms'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Room ID'
          }
        ],
        responses: {
          200: {
            description: 'Room deleted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessOnly' }
              }
            }
          },
          400: {
            description: 'Invalid query parameters',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          404: {
            description: 'Room not found or unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      }
    },
    '/api/rooms/by-id/{roomId}': {
      get: {
        summary: 'Get room by ID',
        tags: ['Rooms'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'roomId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Room retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    room: { $ref: '#/components/schemas/Room' }
                  },
                  required: ['room']
                }
              }
            }
          },
          400: {
            description: 'Missing room id',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          404: {
            description: 'Room not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      }
    },
    '/api/rooms/{roomId}/rejoin': {
      get: {
        summary: 'Get missed messages for room (query variant)',
        tags: ['Rooms', 'Messages'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'roomId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          },
          {
            in: 'query',
            name: 'userId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Missed/recent messages retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MissedMessagesResponse' }
              }
            }
          },
          400: {
            description: 'Missing required parameters',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          403: {
            description: 'Forbidden (user mismatch)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      },
      post: {
        summary: 'Get missed messages for room (body variant)',
        tags: ['Rooms', 'Messages'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'roomId',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RejoinRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Missed/recent messages retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MissedMessagesResponse' }
              }
            }
          },
          400: {
            description: 'Missing required fields',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          403: {
            description: 'Forbidden (user mismatch)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      }
    },
    '/api/rooms/generate': {
      post: {
        summary: 'Generate AI room suggestion',
        tags: ['Rooms', 'AI Assistant'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GenerateRoomRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Suggestion generated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GenerateRoomResponse' }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          403: {
            description: 'Forbidden (anonymous user restricted)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          500: {
            description: 'AI generation failed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      }
    },
    '/api/messages/send': {
      post: {
        summary: 'Send a message',
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
                    message: { $ref: '#/components/schemas/ChatMessage' }
                  },
                  required: ['success', 'message']
                }
              }
            }
          },
          400: {
            description: 'Validation failed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          403: {
            description: 'Forbidden (sender mismatch / anonymous)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          500: {
            description: 'Failed to send message',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      }
    },
    '/api/messages/unsend': {
      post: {
        summary: 'Unsend (soft-delete) a message',
        tags: ['Messages'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UnsendMessageRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Message unsent successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { $ref: '#/components/schemas/ChatMessage' }
                  },
                  required: ['success', 'message']
                }
              }
            }
          },
          400: {
            description: 'Validation failed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          404: {
            description: 'Message not found or not permitted',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          500: {
            description: 'Failed to unsend message',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      }
    },
    '/api/messages/mark-received': {
      post: {
        summary: 'Mark message as received',
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
            description: 'Message marked as received',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessOnly' }
              }
            }
          },
          400: {
            description: 'Validation failed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          403: {
            description: 'Forbidden (user mismatch)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          500: {
            description: 'Failed to mark message as received',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      }
    },
    '/api/ai/stream': {
      post: {
        summary: 'Stream AI responses',
        description: 'Streams Server-Sent Events (SSE) from the AI assistant.',
        tags: ['AI Assistant'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AIStreamRequest' }
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
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          403: {
            description: 'Forbidden',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          },
          500: {
            description: 'AI service error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } }
            }
          }
        }
      }
    }
  }
}
