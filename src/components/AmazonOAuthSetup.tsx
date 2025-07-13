import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink, Settings, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
const AmazonOAuthSetup = () => {
  const currentDomain = window.location.origin;
  const redirectUri = `${currentDomain}/auth/amazon/callback`;
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };
  const redirectUris = [`${currentDomain}/auth/amazon/callback`, 'https://ppcpal.online/auth/amazon/callback', 'http://localhost:3000/auth/amazon/callback'];
  return <Card className="mt-6 border-orange-200">
      
      
    </Card>;
};
export default AmazonOAuthSetup;