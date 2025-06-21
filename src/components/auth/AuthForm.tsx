
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";

interface AuthFormProps {
  formData: {
    email: string;
    password: string;
    confirmPassword: string;
  };
  errors?: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
  showPassword: boolean;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePassword: () => void;
  onSignIn: (e: React.FormEvent) => void;
  onSignUp: (e: React.FormEvent) => void;
}

const AuthForm = ({
  formData,
  errors = {},
  showPassword,
  isLoading,
  onInputChange,
  onTogglePassword,
  onSignIn,
  onSignUp
}: AuthFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <CardDescription>
          Sign in to your account or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <SignInForm
              formData={formData}
              errors={errors}
              showPassword={showPassword}
              isLoading={isLoading}
              onInputChange={onInputChange}
              onTogglePassword={onTogglePassword}
              onSubmit={onSignIn}
            />
          </TabsContent>
          
          <TabsContent value="signup">
            <SignUpForm
              formData={formData}
              errors={errors}
              showPassword={showPassword}
              isLoading={isLoading}
              onInputChange={onInputChange}
              onTogglePassword={onTogglePassword}
              onSubmit={onSignUp}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AuthForm;
