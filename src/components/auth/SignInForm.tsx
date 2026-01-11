
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

interface SignInFormProps {
  formData: {
    email: string;
    password: string;
  };
  showPassword: boolean;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
}

const SignInForm = ({
  formData,
  showPassword,
  isLoading,
  onInputChange,
  onTogglePassword,
  onSubmit,
  onForgotPassword
}: SignInFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="signin-email"
            name="email"
            type="email"
            placeholder="Enter your email"
            className="pl-10"
            value={formData.email}
            onChange={onInputChange}
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-primary hover:text-primary/80 hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="signin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            className="pl-10 pr-10"
            value={formData.password}
            onChange={onInputChange}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
};

export default SignInForm;
