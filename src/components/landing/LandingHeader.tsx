
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import LogoProcessor from "@/components/LogoProcessor";
import { Menu, X } from "lucide-react";
import { useState } from "react";

interface LandingHeaderProps {
  user: any;
}

const LandingHeader = ({ user }: LandingHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-2.5 shadow-lg group-hover:shadow-indigo-500/25 transition-all duration-300">
              <LogoProcessor 
                originalSrc="/lovable-uploads/f599cf68-ce1e-4dc1-9e76-3870678e6772.png"
                alt="PPC Pal Logo"
                className="h-6 w-6 text-white"
              />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              PPC Pal
            </h1>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              to="/company" 
              className="text-gray-600 hover:text-indigo-600 font-medium transition-colors duration-200 hover:scale-105 transform"
            >
              Company
            </Link>
            <Link 
              to="/about" 
              className="text-gray-600 hover:text-indigo-600 font-medium transition-colors duration-200 hover:scale-105 transform"
            >
              About
            </Link>
            <Link 
              to="/contact" 
              className="text-gray-600 hover:text-indigo-600 font-medium transition-colors duration-200 hover:scale-105 transform"
            >
              Contact
            </Link>
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105">
                  Get Started
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200">
            <nav className="flex flex-col gap-4 pt-4">
              <Link 
                to="/company" 
                className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Company
              </Link>
              <Link 
                to="/about" 
                className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link 
                to="/contact" 
                className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              {user ? (
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                    Get Started
                  </Button>
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default LandingHeader;
