interface ErrorContext {
  userId?: string;
  connectionId?: string;
  campaignId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface ErrorDetails {
  message: string;
  stack?: string;
  code?: string | number;
  timestamp: Date;
  context?: ErrorContext;
}

class ErrorTracker {
  private errors: ErrorDetails[] = [];
  private maxErrors = 100;

  captureError(error: Error | string, context?: ErrorContext): void {
    const errorDetails: ErrorDetails = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error !== 'string' ? error.stack : undefined,
      timestamp: new Date(),
      context
    };

    // Add to local storage
    this.errors.unshift(errorDetails);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', errorDetails);
    }

    // In production, you would send to external service
    this.sendToExternalService(errorDetails);
  }

  captureAmazonError(error: Error | string, context: {
    connectionId?: string;
    endpoint?: string;
    operation?: string;
    profileId?: string;
  }): void {
    this.captureError(error, {
      ...context,
      component: 'AmazonAPI'
    });
  }

  captureFormError(error: Error | string, context: {
    formName: string;
    fieldName?: string;
    validationErrors?: Record<string, string>;
  }): void {
    this.captureError(error, {
      ...context,
      component: 'Form'
    });
  }

  captureOptimizationError(error: Error | string, context: {
    optimizationId?: string;
    campaignIds?: string[];
    optimizationType?: string;
  }): void {
    this.captureError(error, {
      ...context,
      component: 'Optimization'
    });
  }

  getRecentErrors(limit = 10): ErrorDetails[] {
    return this.errors.slice(0, limit);
  }

  clearErrors(): void {
    this.errors = [];
  }

  private async sendToExternalService(errorDetails: ErrorDetails): Promise<void> {
    // In a real app, you'd send to Sentry, LogRocket, etc.
    // For now, just store locally
    try {
      const stored = localStorage.getItem('ppc-pal-errors');
      const errors = stored ? JSON.parse(stored) : [];
      errors.unshift({
        ...errorDetails,
        timestamp: errorDetails.timestamp.toISOString()
      });
      
      // Keep only recent errors
      if (errors.length > 50) {
        errors.splice(50);
      }
      
      localStorage.setItem('ppc-pal-errors', JSON.stringify(errors));
    } catch (e) {
      console.warn('Failed to store error locally:', e);
    }
  }
}

export const errorTracker = new ErrorTracker();

// Error boundary helper
export function withErrorTracking<T extends (...args: any[]) => any>(
  fn: T,
  context?: ErrorContext
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          errorTracker.captureError(error, context);
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      errorTracker.captureError(error as Error, context);
      throw error;
    }
  }) as T;
}
