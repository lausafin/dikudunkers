// src/lib/redis.ts
import { createClient, RedisClientType } from 'redis';

// We declare the client variable in the module scope, but we don't initialize it here.
let redisClient: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType> {
  // If the client already exists and is connected, reuse it.
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  // If not, create a new client.
  const client = createClient({
    url: process.env.REDIS_URL
  });

  client.on('error', (err) => console.error('Redis Client Error', err));

  // Connect the new client.
  await client.connect();

  // Store the connected client in the module scope for future reuse.
  redisClient = client as RedisClientType;
  return redisClient;
}

export default getRedisClient;