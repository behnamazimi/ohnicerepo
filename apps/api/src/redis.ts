// Upstash Redis REST API client (Workers-compatible)
// Uses Upstash REST API format: https://docs.upstash.com/redis/features/restapi
export class UpstashRedis {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    // Ensure URL doesn't end with /
    this.url = url.endsWith('/') ? url.slice(0, -1) : url;
    this.token = token;
  }

  private async executeCommand(command: string[]): Promise<any> {
    const response = await fetch(`${this.url}/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Redis command failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as { result: any };
    return data.result;
  }

  async get<T>(key: string): Promise<T | null> {
    const result = await this.executeCommand(['GET', key]);
    if (result === null) {
      return null;
    }
    // Upstash returns numbers as strings, so parse if needed
    if (typeof result === 'string' && /^-?\d+$/.test(result)) {
      return parseInt(result, 10) as T;
    }
    return result as T;
  }

  async set(key: string, value: number, options?: { ex?: number }): Promise<void> {
    const command: string[] = ['SET', key, value.toString()];
    if (options?.ex) {
      command.push('EX', options.ex.toString());
    }
    await this.executeCommand(command);
  }

  async incr(key: string): Promise<number> {
    const result = await this.executeCommand(['INCR', key]);
    return typeof result === 'number' ? result : parseInt(result, 10);
  }

  async ttl(key: string): Promise<number> {
    const result = await this.executeCommand(['TTL', key]);
    return typeof result === 'number' ? result : parseInt(result, 10);
  }

  async setJson(key: string, value: any, options?: { ex?: number }): Promise<void> {
    const command: string[] = ['SET', key, JSON.stringify(value)];
    if (options?.ex) {
      command.push('EX', options.ex.toString());
    }
    await this.executeCommand(command);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const result = await this.executeCommand(['GET', key]);
    if (result === null) {
      return null;
    }
    if (typeof result === 'string') {
      try {
        return JSON.parse(result) as T;
      } catch {
        return result as T;
      }
    }
    return result as T;
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.executeCommand(['EXISTS', key]);
    return result === 1;
  }

  async del(key: string): Promise<void> {
    await this.executeCommand(['DEL', key]);
  }
}

