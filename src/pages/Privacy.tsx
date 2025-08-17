
import React from 'react';
import DashboardShell from '@/components/DashboardShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, FileText } from 'lucide-react';

const Privacy = () => {
  return (
    <DashboardShell>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          <p className="text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Personal Information</h4>
                <p className="text-gray-700">
                  We collect information you provide directly to us, such as when you create an account, 
                  use our services, or contact us for support. This includes:
                </p>
                <ul className="list-disc ml-6 mt-2 text-gray-700">
                  <li>Email address</li>
                  <li>Account preferences</li>
                  <li>PPC campaign data from connected accounts</li>
                  <li>Feedback and support communications</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Usage Information</h4>
                <p className="text-gray-700">
                  We automatically collect certain information about your use of our service, including:
                </p>
                <ul className="list-disc ml-6 mt-2 text-gray-700">
                  <li>Log data and usage analytics</li>
                  <li>Device and browser information</li>
                  <li>IP address and location data</li>
                  <li>Feature usage and optimization history</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">We use the information we collect to:</p>
              <ul className="list-disc ml-6 text-gray-700 space-y-1">
                <li>Provide and improve our PPC optimization services</li>
                <li>Process your advertising data and generate insights</li>
                <li>Communicate with you about your account and our services</li>
                <li>Provide customer support</li>
                <li>Comply with legal obligations</li>
                <li>Protect against fraud and abuse</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Data Sharing and Disclosure</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties, 
                except in the following circumstances:
              </p>
              <ul className="list-disc ml-6 text-gray-700 space-y-1">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>With trusted service providers who assist in our operations</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Your Rights Under GDPR</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                If you are a resident of the European Economic Area (EEA), you have the following rights:
              </p>
              <ul className="list-disc ml-6 text-gray-700 space-y-1">
                <li><strong>Right to Access:</strong> Request copies of your personal data</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
                <li><strong>Right to Data Portability:</strong> Request transfer of your data</li>
                <li><strong>Right to Object:</strong> Object to processing of your data</li>
                <li><strong>Right to Restrict Processing:</strong> Request limitation of data processing</li>
              </ul>
              <p className="text-gray-700 mt-4">
                To exercise these rights, please visit your account settings or contact us at privacy@ppcpal.com
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Data Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                We retain your personal information for as long as necessary to provide our services 
                and fulfill the purposes outlined in this privacy policy. Specifically:
              </p>
              <ul className="list-disc ml-6 mt-2 text-gray-700 space-y-1">
                <li>Account data: Until account deletion</li>
                <li>PPC campaign data: 2 years after last sync</li>
                <li>Usage analytics: 2 years</li>
                <li>Support communications: 3 years</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Data Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                We implement appropriate technical and organizational measures to protect your personal data 
                against unauthorized access, alteration, disclosure, or destruction. This includes encryption, 
                access controls, and regular security assessments.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                We use essential cookies to provide our services and may use analytics cookies to improve 
                our platform. You can manage your cookie preferences through your browser settings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="mt-2 text-gray-700">
                <p>Email: privacy@ppcpal.com</p>
                <p>Data Protection Officer: dpo@ppcpal.com</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
};

export default Privacy;
