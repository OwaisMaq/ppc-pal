
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import LogoProcessor from "@/components/LogoProcessor";

interface LandingHeaderProps {
  user: any;
}

const LandingHeader = ({ user }: LandingHeaderProps) => {
  return (
    <header className="bg-black/20 backdrop-blur-md border-b border-purple-500/20 px-4 py-3 relative z-10">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-full p-2 shadow-lg shadow-purple-500/30">
            <LogoProcessor 
              originalSrc="/lovable-uploads/f599cf68-ce1e-4dc1-9e76-3870678e6772.png"
              alt="PPC Pal Logo"
              className="h-6 w-6"
            />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            PPC Pal
          </h1>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/company" className="text-purple-200 hover:text-white transition-all duration-300 hover:scale-105">
            Company
          </Link>
          <Link to="/about" className="text-purple-200 hover:text-white transition-all duration-300 hover:scale-105">
            About
          </Link>
          <Link to="/contact" className="text-purple-200 hover:text-white transition-all duration-300 hover:scale-105">
            Contact
          </Link>
          {user ? (
            <Link to="/dashboard">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-105">
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-105">
                Sign In
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default LandingHeader;
