
import { Bot } from "lucide-react";

interface AuthHeaderProps {
  mode?: 'signin' | 'signup';
}

const AuthHeader = ({ mode = 'signin' }: AuthHeaderProps) => {
  const getTitle = () => {
    return mode === 'signup' ? 'Create your account' : 'Welcome back';
  };

  const getDescription = () => {
    return mode === 'signup' 
      ? 'Sign up to start optimizing your Amazon advertising campaigns'
      : 'Sign in to optimize your Amazon advertising campaigns';
  };

  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center mb-4">
        <div className="bg-blue-600 rounded-full p-3 mr-3">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">PPC Pal</h1>
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{getTitle()}</h2>
      <p className="text-gray-600">
        {getDescription()}
      </p>
    </div>
  );
};

export default AuthHeader;
