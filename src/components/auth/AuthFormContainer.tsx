
import React, { useState } from 'react';
import EnhancedAuthForm from './EnhancedAuthForm';

interface AuthFormContainerProps {
  mode?: 'signin' | 'signup';
}

const AuthFormContainer = ({ mode: initialMode = 'signin' }: AuthFormContainerProps) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  return (
    <EnhancedAuthForm 
      mode={mode}
      onModeChange={setMode}
    />
  );
};

export default AuthFormContainer;
