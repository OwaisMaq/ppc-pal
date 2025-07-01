
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import AuthHeader from './AuthHeader';
import AuthFormContainer from './AuthFormContainer';
import AuthFooter from './AuthFooter';

interface AuthContainerProps {
  mode?: 'signin' | 'signup';
}

const AuthContainer = ({ mode = 'signin' }: AuthContainerProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <AuthHeader mode={mode} />
          <AuthFormContainer mode={mode} />
          <AuthFooter mode={mode} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthContainer;
