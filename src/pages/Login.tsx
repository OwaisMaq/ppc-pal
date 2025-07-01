
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthContainer from '@/components/auth/AuthContainer';

const Login = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthContainer mode="signin" />;
};

export default Login;
