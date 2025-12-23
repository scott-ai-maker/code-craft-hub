const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Code Craft Hub API',
            version: '1.0.0',
            description: 'A comprehensive user management REST API with authentication, authorization, and email verification',
            contact: {
                name: 'API Support',
                email: 'support@code-craft-hub.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server'
            },
            {
                url: 'https://api.code-craft-hub.com',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            description: 'User ID'
                        },
                        username: {
                            type: 'string',
                            description: 'Unique username'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address'
                        },
                        role: {
                            type: 'string',
                            enum: ['user', 'admin', 'moderator'],
                            description: 'User role'
                        },
                        isVerified: {
                            type: 'boolean',
                            description: 'Email verification status'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        error: {
                            type: 'string',
                            description: 'Error message'
                        }
                    }
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            description: 'Success message'
                        },
                        data: {
                            type: 'object',
                            description: 'Response data'
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ],
        tags: [
            {
                name: 'Authentication',
                description: 'User registration, login, and token management'
            },
            {
                name: 'Users',
                description: 'User profile and account management'
            },
            {
                name: 'Admin',
                description: 'Administrative operations (requires admin role)'
            },
            {
                name: 'Email Verification',
                description: 'Email verification and resend operations'
            },
            {
                name: 'Health',
                description: 'Health check and status endpoints'
            }
        ]
    },
    apis: ['./src/routes/*.js', './src/app.js'] // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = {
    specs,
    swaggerUi
};
