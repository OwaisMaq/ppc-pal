
export interface AmazonApiError {
  status: number;
  message: string;
  code?: string;
  details?: string;
  retryable: boolean;
  requiresReauth: boolean;
}

export class AmazonErrorHandler {
  static parseError(response: Response, responseText?: string): AmazonApiError {
    const status = response.status;
    let message = response.statusText;
    let code: string | undefined;
    let details: string | undefined;
    let retryable = false;
    let requiresReauth = false;

    // Try to parse error response body
    if (responseText) {
      try {
        const errorData = JSON.parse(responseText);
        message = errorData.message || errorData.details || message;
        code = errorData.code;
        details = errorData.details;
      } catch (e) {
        // If not JSON, use as details
        details = responseText;
      }
    }

    // Determine retryability and auth requirements based on status
    switch (status) {
      case 400:
        message = 'Bad Request - Check your request parameters';
        retryable = false;
        break;
        
      case 401:
        message = 'Unauthorized - Token expired or invalid';
        requiresReauth = true;
        retryable = false;
        break;
        
      case 403:
        message = 'Forbidden - Check your permissions and profile access';
        retryable = false;
        // Could be scope issue or wrong profile ID
        if (details?.includes('scope') || details?.includes('profile')) {
          requiresReauth = true;
        }
        break;
        
      case 404:
        message = 'Resource not found';
        retryable = false;
        break;
        
      case 429:
        message = 'Rate limit exceeded - Too many requests';
        retryable = true;
        break;
        
      case 500:
      case 502:
      case 503:
      case 504:
        message = 'Server error - Amazon API temporarily unavailable';
        retryable = true;
        break;
        
      default:
        message = `HTTP ${status}: ${message}`;
        retryable = status >= 500; // Retry server errors
        break;
    }

    return {
      status,
      message,
      code,
      details,
      retryable,
      requiresReauth
    };
  }

  static shouldRetry(error: AmazonApiError, attemptCount: number, maxRetries = 3): boolean {
    if (attemptCount >= maxRetries) {
      return false;
    }

    return error.retryable && !error.requiresReauth;
  }

  static getRetryDelay(attemptCount: number, error?: AmazonApiError): number {
    // For rate limiting, use longer delays
    if (error?.status === 429) {
      return Math.min(1000 * Math.pow(2, attemptCount), 60000); // Max 1 minute
    }
    
    // For server errors, use shorter delays
    return Math.min(500 * Math.pow(2, attemptCount), 10000); // Max 10 seconds
  }
}
