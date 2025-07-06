
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useValidatedForm } from '@/hooks/useValidatedForm';
import { signInFormSchema, signUpFormSchema, SignInFormData, SignUpFormData } from '@/lib/validation/formSchemas';
import { useAuthActions } from '@/hooks/useAuthActions';

interface EnhancedAuthFormProps {
  mode?: 'signin' | 'signup';
  onModeChange?: (mode: 'signin' | 'signup') => void;
}

const EnhancedAuthForm = ({ mode = 'signin', onModeChange }: EnhancedAuthFormProps) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const { signIn, signUp, isLoading } = useAuthActions();
  
  const isSignUp = mode === 'signup';
  const schema = isSignUp ? signUpFormSchema : signInFormSchema;
  
  const form = useValidatedForm({
    schema,
    defaultValues: {
      email: '',
      password: '',
      ...(isSignUp && { confirmPassword: '' })
    },
    onSubmitSuccess: async (data) => {
      if (isSignUp) {
        const signUpData = data as SignUpFormData;
        await signUp(signUpData.email, signUpData.password);
      } else {
        const signInData = data as SignInFormData;
        await signIn(signInData.email, signInData.password);
      }
    }
  });

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </CardTitle>
        <CardDescription>
          {isSignUp 
            ? 'Sign up to start optimizing your Amazon campaigns'
            : 'Sign in to access your PPC optimization dashboard'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...form.register('email')}
              className={form.errors.email ? 'border-red-500' : ''}
            />
            {form.errors.email && (
              <p className="text-sm text-red-500">{form.errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                {...form.register('password')}
                className={form.errors.password ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={togglePassword}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {form.errors.password && (
              <p className="text-sm text-red-500">{form.errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field (Sign Up Only) */}
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                {...form.register('confirmPassword')}
                className={form.errors.confirmPassword ? 'border-red-500' : ''}
              />
              {form.errors.confirmPassword && (
                <p className="text-sm text-red-500">{form.errors.confirmPassword.message}</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || form.isSubmitting}
          >
            {(isLoading || form.isSubmitting) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Button>

          {/* Mode Toggle */}
          <div className="text-center text-sm">
            <span className="text-gray-600">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </span>
            {' '}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={() => onModeChange?.(isSignUp ? 'signin' : 'signup')}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EnhancedAuthForm;
