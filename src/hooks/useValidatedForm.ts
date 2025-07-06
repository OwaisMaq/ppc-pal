
import { useForm, UseFormProps, FieldValues, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';
import { toast } from 'sonner';

interface UseValidatedFormOptions<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  schema: ZodSchema<T>;
  showErrorToast?: boolean;
  onSubmitSuccess?: (data: T) => void | Promise<void>;
  onSubmitError?: (error: Error) => void;
}

export function useValidatedForm<T extends FieldValues>({
  schema,
  showErrorToast = true,
  onSubmitSuccess,
  onSubmitError,
  ...formOptions
}: UseValidatedFormOptions<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    ...formOptions
  });

  const handleSubmit = form.handleSubmit(
    async (data: T) => {
      try {
        await onSubmitSuccess?.(data);
      } catch (error) {
        console.error('Form submission error:', error);
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred';
        
        if (showErrorToast) {
          toast.error('Submission Failed', {
            description: errorMessage
          });
        }
        
        onSubmitError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    },
    (errors) => {
      console.error('Form validation errors:', errors);
      
      if (showErrorToast) {
        // Show first validation error
        const firstError = Object.values(errors)[0];
        if (firstError?.message) {
          toast.error('Validation Error', {
            description: firstError.message as string
          });
        }
      }
    }
  );

  // Helper to set field errors from server responses
  const setServerErrors = (serverErrors: Record<string, string>) => {
    Object.entries(serverErrors).forEach(([field, message]) => {
      form.setError(field as Path<T>, {
        type: 'server',
        message
      });
    });
  };

  // Helper to clear all errors
  const clearErrors = () => {
    form.clearErrors();
  };

  // Helper to reset form with new data
  const resetWithData = (data: Partial<T>) => {
    form.reset(data);
  };

  return {
    ...form,
    handleSubmit,
    setServerErrors,
    clearErrors,
    resetWithData,
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors
  };
}

// Specialized form hooks
export function useAuthForm<T extends FieldValues>(
  schema: ZodSchema<T>,
  options?: Omit<UseValidatedFormOptions<T>, 'schema'>
) {
  return useValidatedForm({
    schema,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    ...options
  });
}

export function useSettingsForm<T extends FieldValues>(
  schema: ZodSchema<T>,
  options?: Omit<UseValidatedFormOptions<T>, 'schema'>
) {
  return useValidatedForm({
    schema,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    ...options
  });
}
