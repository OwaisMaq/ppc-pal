
import { Bot, Mail, Shield, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const LandingFooter = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-2.5 shadow-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                PPC Pal
              </span>
            </div>
            <p className="text-gray-400 text-lg mb-6 max-w-md">
              Transform your Amazon PPC campaigns with AI-powered optimization. 
              Increase ROI, save time, and grow your business.
            </p>
            <div className="flex items-center gap-2 text-gray-300">
              <Mail className="h-4 w-4" />
              <a href="mailto:info@ppcpal.online" className="hover:text-white transition-colors">
                info@ppcpal.online
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/company" className="text-gray-400 hover:text-white transition-colors">
                  Company
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-gray-400 hover:text-white transition-colors">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-center md:text-left">
              © 2024 WISH AND WILLOW LTD. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm text-center md:text-right">
              Built with ❤️ for Amazon sellers worldwide
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
