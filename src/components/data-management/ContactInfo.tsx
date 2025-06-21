
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const ContactInfo = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Need Help?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-4">
          If you have questions about your data or need assistance with your privacy rights, contact us:
        </p>
        <div className="space-y-2 text-gray-700">
          <p><strong>Privacy Officer:</strong> privacy@ppcpal.com</p>
          <p><strong>Data Protection Officer:</strong> dpo@ppcpal.com</p>
          <p><strong>Support:</strong> support@ppcpal.com</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactInfo;
