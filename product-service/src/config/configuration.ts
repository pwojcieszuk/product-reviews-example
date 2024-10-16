export default () => ({
  app: {
    port: parseInt(process.env.PRODUCT_SERVICE_PORT, 10) || 3000,
    name: 'product-service',
  },
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER || 'user',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE || 'reviewsdb',
  },
  apiDocs: {
    path: process.env.API_DOCS_PATH || 'api',
    active: process.env.API_DOCS_ACTIVE === 'true',
  },
  kafka: {
    broker: process.env.KAFKA_BROKER || 'localhost',
    port: parseInt(process.env.KAFKA_PORT, 10) || 9092,
    clientId: process.env.KAFKA_CLIENT_ID || 'product-service',
  },
});
