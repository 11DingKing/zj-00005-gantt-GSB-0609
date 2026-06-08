import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  async onModuleInit() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl: number = 30): Promise<void> {
    await this.redis.set(key, value, 'EX', ttl);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async getTasks(projectId: string): Promise<any | null> {
    const data = await this.get(`tasks:${projectId}`);
    return data ? JSON.parse(data) : null;
  }

  async setTasks(projectId: string, tasks: any): Promise<void> {
    await this.set(`tasks:${projectId}`, JSON.stringify(tasks), 30);
  }

  async invalidateTasks(projectId: string): Promise<void> {
    await this.del(`tasks:${projectId}`);
  }
}
