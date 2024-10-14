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
TODO


