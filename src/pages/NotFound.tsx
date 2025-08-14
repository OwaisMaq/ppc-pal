import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Bot, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* Branding */}
            <div className="flex items-center justify-center mb-6">
              <div className="bg-primary rounded-full p-3 mr-3">
                <Bot className="h-6 w-6 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">PPC Pal</h2>
            </div>
            
            {/* 404 Content */}
            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-primary">404</h1>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">Page Not Found</h3>
                <p className="text-muted-foreground">
                  Sorry, we couldn't find the page you're looking for.
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="space-y-3 pt-4">
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
                size="lg"
              >
                <Home className="h-4 w-4 mr-2" />
                Return to Home
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(-1)}
                className="w-full"
              >
                Go Back
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
