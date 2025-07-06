
export class AmazonRateLimiter {
  private requestTimes: number[] = [];
  private consecutiveErrors = 0;
  private lastErrorTime = 0;
  
  // Conservative rate limiting - Amazon uses dynamic throttling
  private readonly MAX_REQUESTS_PER_SECOND = 2;
  private readonly MAX_CONSECUTIVE_ERRORS = 3;
  private readonly ERROR_COOLDOWN_MS = 30000; // 30 seconds

  async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Clean old requests (older than 1 second)
    this.requestTimes = this.requestTimes.filter(time => now - time < 1000);
    
    // Check if we're in error cooldown
    if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
      const timeSinceLastError = now - this.lastErrorTime;
      if (timeSinceLastError < this.ERROR_COOLDOWN_MS) {
        const waitTime = this.ERROR_COOLDOWN_MS - timeSinceLastError;
        console.log(`Rate limiter: In error cooldown, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
        // Reset error count after cooldown
        this.consecutiveErrors = 0;
      }
    }
    
    // Check requests per second limit
    if (this.requestTimes.length >= this.MAX_REQUESTS_PER_SECOND) {
      const waitTime = 1000 - (now - this.requestTimes[0]);
      if (waitTime > 0) {
        console.log(`Rate limiter: Waiting ${waitTime}ms to respect rate limit`);
        await this.sleep(waitTime);
      }
    }
    
    this.requestTimes.push(now);
  }

  recordSuccess(): void {
    // Reset consecutive errors on successful request
    this.consecutiveErrors = 0;
  }

  recordError(statusCode?: number): void {
    this.lastErrorTime = Date.now();
    
    // Only count 429 (rate limit) and 5xx errors as consecutive errors
    if (statusCode === 429 || (statusCode && statusCode >= 500)) {
      this.consecutiveErrors++;
      console.log(`Rate limiter: Recorded error (${statusCode}), consecutive errors: ${this.consecutiveErrors}`);
    }
  }

  async handleRateLimitError(retryAfter?: number): Promise<void> {
    this.recordError(429);
    
    // Use Retry-After header if provided, otherwise exponential backoff
    const baseDelay = retryAfter ? retryAfter * 1000 : 1000;
    const exponentialDelay = baseDelay * Math.pow(2, this.consecutiveErrors - 1);
    const maxDelay = 60000; // Max 1 minute
    
    const waitTime = Math.min(exponentialDelay, maxDelay);
    
    console.log(`Rate limiter: 429 received, waiting ${waitTime}ms before retry`);
    await this.sleep(waitTime);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): { requestsInLastSecond: number; consecutiveErrors: number; inCooldown: boolean } {
    const now = Date.now();
    const recentRequests = this.requestTimes.filter(time => now - time < 1000);
    const inCooldown = this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS && 
                      (now - this.lastErrorTime) < this.ERROR_COOLDOWN_MS;
    
    return {
      requestsInLastSecond: recentRequests.length,
      consecutiveErrors: this.consecutiveErrors,
      inCooldown
    };
  }
}
