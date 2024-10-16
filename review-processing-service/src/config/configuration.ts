export default () => ({
  app: {
    port: parseInt(process.env.REVIEW_PROCESSING_SERVICE_PORT, 10) || 3000,
    name: 'review-processing-service',
  },
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER || 'user',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE || 'reviewsdb',
  },
});
