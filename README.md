# Product and Review Processing Microservices Architecture

## Overview

This system consists of two microservices:
1. **Product Service**: Manages products and allows users to interact with products   (create, delete, edit, list and get by
identifier) and reviews (create, delete and edit actions) through a RESTful API.
2. **Review Processing Service**: Processes review-related events and updates product average ratings dynamically using a queue-based event-driven system.

The services are based on **NestJs** and leverage **Kafka** for event-driven communication, **Redis** for caching, **BullMQ** for concurrent events distribution, and **PostgreSQL** for persistent storage.

## Architecture Components

![Architecture-diagram](https://github.com/user-attachments/assets/c05c3858-31cd-4e7a-b174-b8800456cb66)

### 1. **Product Service**

The **Product Service** is responsible for:
- Managing product data (e.g., name, description, price).
- Providing a RESTful API for:
  - **CRUD operations** on products.
  - Viewing products and their **average ratings**.
  - Managing reviews (add, update, delete reviews).
  
When a new review is added, updated, or deleted, the Product Service publishes a corresponding event to **Kafka** to notify the **Review Processing Service**.

### 2. **Review Processing Service**

The **Review Processing Service** handles events published by the Product Service, such as:
- **Review added**.
- **Review updated**.
- **Review deleted**.

The service listens for these events from **Kafka**, processes the event, and updates the product’s average rating dynamically. It utilizes **Redis** to cache the average rating and number of reviews to avoid recalculating the rating from scratch with every event.

### 3. **Redis**

**Redis** is used as an in-memory cache to store:
- **Product average ratings**: To reduce the need for database queries.
- **Review counts**: To maintain the number of reviews for each product.

Caching the average rating and review count in Redis allows for faster calculations of the new average rating when a new review is added, updated, or deleted.

### 4. **PostgreSQL**

**PostgreSQL** serves as the persistent storage for:
- **Products**: Each product's details (e.g., name, description, price).
- **Reviews**: Each review’s rating and related product information.
- **Average Ratings** Average ratings will **not** be persisted in the database - to update Redis cache SQL AVG function will be used
  
### 5. **Kafka (for Event-Driven Communication)**

**Kafka** is used to enable event-driven communication between the services. The **Product Service** publishes events to Kafka topics such as:
- `review-created`
- `review-updated`
- `review-deleted`

The **Review Processing Service** consumes these events and processes them by updating the relevant product's average rating.

## Workflow

### 1. **Adding a New Review**

1. A user submits a review via the Product Service.
2. The Product Service stores the review in the PostgreSQL database.
3. The Product Service publishes a `review-created` event to Kafka, which includes the `productId`, the `rating`, and any other relevant details.
4. The Review Processing Service consumes the `review-created` event:
   - It fetches the current **average rating** and **review count** from Redis.
   - Using the new review's rating and the existing values from Redis, it **dynamically calculates** the new average rating using the formula:
     \[
     \text{new\_average} = \frac{(\text{current\_average} \times \text{current\_count}) + \text{new\_rating}}{\text{current\_count} + 1}
     \]
   - It updates the Redis cache with the new average rating and increments the review count.
   - If Redis data is unavailable or an error occurs, the service falls back to querying PostgreSQL to calculate the new average rating.
5. The updated average rating is cached in Redis and can be retrieved in future product requests.

### 2. **Updating or Deleting a Review**

The process for updating or deleting a review follows a similar flow:
1. A user updates or deletes a review via the Product Service.
2. The service publishes either a `review-updated` or `review-deleted` event to Kafka.
3. The Review Processing Service consumes the event and updates the average rating accordingly:
   - **For updates**: It adjusts the cached average using the difference between the old and new ratings.
   - **For deletions**: It recalculates the average by removing the deleted review’s contribution using the formula:
     \[
     \text{new\_average} = \frac{(\text{current\_average} \times \text{current\_count}) - \text{deleted\_rating}}{\text{current\_count} - 1}
     \]

## Redis Caching Strategy

To minimize database load, we cache the following data in Redis:
- **Product average rating**: `product:<productId>:rating`
- **Review count**: `product:<productId>:reviewCount`

Redis acts as the primary source for average rating calculations. The fallback mechanism ensures that if data is missing in Redis, the service queries PostgreSQL to calculate the average and update Redis.

### Cache Structure
- **Key format**: `product:<productId>:rating` and `product:<productId>:reviewCount`
- **TTL (Optional)**: You can set a time-to-live (TTL) on the Redis keys to avoid stale data persisting indefinitely.

### BullMQ for Concurrency

- **Review Event Processing**: Whenever a review is created, updated, or deleted, the Review Processing Service uses BullMQ to queue the review event for processing.
- **Task Concurrency**: BullMQ allows us to set limits on how many review events can be processed simultaneously by the service, helping us manage system resources effectively.
- **Retry Mechanism**: If an event fails to process (e.g., due to a temporary issue with the database or Redis), BullMQ automatically retries the job after a short delay.
- **Persistence**: BullMQ stores jobs temporarily in Redis, ensuring that the service can process the events even after restarts or crashes, although it does not provide long-term durability like Kafka.

## Scalability

The Review Processing Service is designed to be horizontally scalable. Multiple instances of the service can process review events concurrently, as follows:

- **Kafka ensures event distribution**: Events are distributed across multiple instances of the Review Processing Service, allowing for parallel processing.
- **BullMQ manages job queues**: BullMQ is used to manage the review-related jobs (events) in a Redis-backed queue. It allows the system to process review events with controlled concurrency and provides automatic retry mechanisms for failed jobs. Each instance of the Review Processing Service can pull jobs from the BullMQ queue and process them in parallel, ensuring that the system scales effectively.
- **Redis ensures cache consistency**: All instances of the Review Processing Service read from and write to the same Redis instance, ensuring that average ratings and review counts remain consistent.
- **PostgreSQL for persistence**: PostgreSQL serves as the source of truth for all product and review data, and Redis acts as a performance-enhancing cache.

## Considerations for potential improvement

- Distribution of reviev processing across multiple instances of Review Processing Service can potentially lead to race conditions in calculating most recent average (event ordering and consistency in distributed systems). In current implementation this is not taken into account - in case of reviews averages potential delay is considered as acceptable.

## Installation

To run the app:

1. Install Docker and docker-compose (https://docs.docker.com/compose/install/)
2. Copy `.env-example` into `.env`, update values if needed.
2. Run `docker compose up -d` in the root directory.

If `API_DOCS_ACTIVE` environment variable is set to true, Product service API can be explored and tested under the url defined by `API_DOCS_PATH` (defaults to `http://localhost:3000/api).

## Configuration

To run the application, you'll need to configure the environment variables by copying the settings from the provided `.env.example` file into a new `.env` file in the root directory of the project. This configuration is shared by both the `Product Service` and the `Review Processing Service`.

You can copy the file using the following command:

```bash
cp .env.example .env
```

| Variable                         | Description                                                                                   | Default Value      |
|-----------------------------------|-----------------------------------------------------------------------------------------------|--------------------|
| `DATABASE_USER`                   | The username for accessing the PostgreSQL database.                                            | `user`             |
| `DATABASE_PASSWORD`               | The password for the PostgreSQL database user.                                                 | `password`         |
| `DATABASE_DB`                     | The name of the PostgreSQL database used by the services.                                      | `reviewsdb`        |
| `DATABASE_PORT`                   | The port on which the PostgreSQL database is running.                                          | `5432`             |
| `DATABASE_HOST`                   | The hostname or IP address of the PostgreSQL database.                                         | `postgres`         |
| `PRODUCT_SERVICE_PORT`            | The port where the Product Service will be exposed.                                            | `3000`             |
| `REVIEW_PROCESSING_SERVICE_PORT`  | The port where the Review Processing Service will be exposed.                                  | `3001`             |
| `REDIS_PORT`                      | The port on which Redis is running.                                                           | `6379`             |
| `REDIS_HOST`                      | The hostname or IP address of the Redis instance.                                              | `redis`            |
| `KAFKA_PORT`                      | The port on which the Kafka broker is running.                                                 | `9092`             |
| `KAFKA_BROKER`                    | The hostname or IP address of the Kafka broker.                                                | `kafka`            |
| `KAFKA_TOPIC`                     | The Kafka topic used to handle review-related events.                                          | `review-events`    |
| `API_DOCS_PATH`                   | The path where the Swagger API documentation will be available.                                | `api`              |
| `API_DOCS_ACTIVE`                 | Set to `true` to enable the Swagger API documentation. **Do not use in production environments**. | `false`            |

## Important Notes and Areas for Improvement

### Assumptions and Considerations

While building this application, I worked with the assumption that it is not yet production-ready. Some parts of the code have been marked with comments indicating areas that should be addressed when moving to production.

### Things to Improve

- **Monorepo Structure**: Using a monorepo (e.g., `pnpm workspace`, `nx` or Nest's monorepo approach) or organizing apps in Git submodules could be a future improvement. In a real-world scenario, this would be a decision to make after the app grows, but it's not necessary from the start.
  
- **API Security**: Currently, there is no token-based authentication or other security mechanisms. The API is essentially open, and for production, proper security layers (e.g., JWT, OAuth) would be essential.

- **.env File for All Apps**: At present, a single `.env` file is shared across all apps for convenience. In a truly distributed environment, this would likely need to be separated per service for better scalability and security.

- **Lack of Pagination**: The REST API lacks pagination or other limiting solutions. For scalability and performance, adding pagination would be necessary when handling larger datasets.

- **Product Average Rating Persistence**: 
  - Currently, product average ratings are **not persisted in the database**. My reasoning:
    1. This information is already present and can be calculated from the existing reviews using PostgreSQL's `AVG()` function.
    2. Persisting the average rating in the database would require frequent updates and could strain the database.
    3. A more efficient solution in this case is to store the review averages in **Redis** and, in cases of cache misses, calculate them from the database.
  - In a real-world scenario, I would discuss this approach with the team to ensure we make the best decision for performance and data integrity.

- **Performance Optimizations**: 
  - Currently, I rely on calculating the average from all reviews in the database when updating the review count. A more performant approach would be to **persist the average rating** in the database but only update it periodically to avoid frequent write operations. This would optimize the application for handling a larger volume of reviews.
  
- **Package Refactoring**: Some functionalities, such as the **Redis service**, could be extracted into separate packages or libraries to improve reusability across different services.

- **E2E Integration Tests**: For better test isolation and modularity, I would recommend creating a **separate app for end-to-end (E2E) integration tests**. This approach allows for more flexibility in simulating real-world environments and improves the scalability of the testing infrastructure.

- **Scalable Container Orchestration**: 
  - While Docker Compose is used for local development due to familiarity and ease of use, it **might be not suitable for production environments** where scalability is critical.
  - In a production environment, it would be better to use a more scalable container orchestration platform such as **K3s** or **Kubernetes**. These platforms offer better tools for managing, scaling, and monitoring distributed services in real-time.
  - For local development, Docker Compose remains an effective and convenient choice.
