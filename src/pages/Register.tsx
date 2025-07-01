
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthContainer from '@/components/auth/AuthContainer';

const Register = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthContainer mode="signup" />;
};

export default Register;
