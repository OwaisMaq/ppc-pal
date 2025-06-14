
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Building2, Mail, MapPin, Phone, Users, Award, Target } from "lucide-react";
import { Link } from "react-router-dom";

const Company = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-full p-2">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PPC Pal</h1>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-600 hover:text-blue-600 transition-colors">
              Home
            </Link>
            <Link to="/about" className="text-gray-600 hover:text-blue-600 transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-gray-600 hover:text-blue-600 transition-colors">
              Contact
            </Link>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        {/* Company Header */}
        <div className="text-center mb-16">
          <Building2 className="h-16 w-16 text-blue-600 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            WISH AND WILLOW LTD
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A technology company dedicated to empowering e-commerce businesses through AI-powered optimization tools
          </p>
        </div>

        {/* Company Overview */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Company Overview</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                WISH AND WILLOW LTD is a UK-based technology company founded with the mission of helping 
                e-commerce businesses maximize their potential through intelligent automation and optimization.
              </p>
              <p>
                Our flagship product, PPC Pal, represents years of research and development in artificial 
                intelligence and machine learning applied to Amazon advertising optimization. We understand 
                the challenges that sellers face in managing complex PPC campaigns and have built solutions 
                that deliver measurable results.
              </p>
              <p>
                As an official Amazon Advertising Partner, we work closely with Amazon's API systems to 
                provide our customers with the most accurate and up-to-date campaign optimization capabilities.
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  To democratize advanced advertising optimization by making enterprise-level AI tools 
                  accessible to businesses of all sizes.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Our Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Our team consists of experienced software engineers, data scientists, and e-commerce 
                  specialists who understand both the technical and business sides of online selling.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  Our Values
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We believe in transparency, data security, and delivering genuine value to our customers. 
                  Every feature we build is designed with the end user's success in mind.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Company Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Information</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Legal Entity</h3>
              <div className="space-y-2 text-gray-600">
                <p><strong>Company Name:</strong> WISH AND WILLOW LTD</p>
                <p><strong>Registration:</strong> UK Private Limited Company</p>
                <p><strong>Industry:</strong> Software Development & E-commerce Technology</p>
                <p><strong>Founded:</strong> 2024</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:info@ppcpal.online" className="hover:text-blue-600 transition-colors">
                    info@ppcpal.online
                  </a>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="h-4 w-4" />
                  <span>United Kingdom</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Products</h2>
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <div className="bg-blue-600 rounded-full p-3 w-fit mx-auto mb-4">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">PPC Pal</CardTitle>
              <CardDescription className="text-lg">
                AI-Powered Amazon PPC Optimization Platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Our flagship product that helps Amazon sellers optimize their advertising campaigns using 
                advanced machine learning algorithms. PPC Pal analyzes campaign performance, identifies 
                optimization opportunities, and provides actionable recommendations to improve ROI.
              </p>
              <Link to="/auth">
                <Button size="lg">
                  Try PPC Pal Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="bg-blue-600 rounded-full p-2">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <span className="text-lg font-semibold">PPC Pal</span>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-gray-400 mb-1">© 2024 WISH AND WILLOW LTD</p>
              <p className="text-gray-400">All rights reserved</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Company;
