
import { AuthProvider } from "@/contexts/AuthContext";
import AuthContainer from "@/components/auth/AuthContainer";

const Auth = () => {
  return (
    <AuthProvider>
      <AuthContainer />
    </AuthProvider>
  );
};

export default Auth;
