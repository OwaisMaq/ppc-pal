
import { Bot } from "lucide-react";

const AuthHeader = () => {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center mb-4">
        <div className="bg-blue-600 rounded-full p-3 mr-3">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">PPC Pal</h1>
      </div>
      <p className="text-gray-600">
        Sign in to optimize your Amazon advertising campaigns
      </p>
    </div>
  );
};

export default AuthHeader;
