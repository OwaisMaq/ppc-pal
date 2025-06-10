
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Download, HelpCircle } from "lucide-react";

const AmazonGuide = () => {
  const steps = [
    {
      title: "Step 1: Navigate to Bulk Operations",
      description: "In your Amazon Advertising console, go to 'Sponsored ads' and then click on 'Bulk operations'",
      image: "/lovable-uploads/bda7d203-91b5-4329-947b-2ce46773ed8e.png",
      alt: "Amazon navigation showing Sponsored ads expanded with Bulk operations highlighted"
    },
    {
      title: "Step 2: Create & Download Template",
      description: "On the Bulk operations page, configure your settings and click 'Create spreadsheet for download' to get your bulk template",
      image: "/lovable-uploads/47be75a0-13ac-45cd-bad8-df3a6e6237a7.png",
      alt: "Bulk operations page showing the create spreadsheet options and download button"
    }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 shadow-lg">
          <HelpCircle className="h-5 w-5 mr-2" />
          How to Download Amazon Bulk Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="h-6 w-6 text-blue-600" />
            Amazon Bulk Template Download Guide
          </DialogTitle>
          <DialogDescription className="text-base">
            Follow these steps to download your bulk template from Amazon Advertising
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Side-by-side layout for both steps */}
          <div className="grid md:grid-cols-2 gap-6">
            {steps.map((step, index) => (
              <Card key={index} className="border-2">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-center">{step.title}</h3>
                    <p className="text-gray-600 text-sm text-center">{step.description}</p>
                    
                    <div className="flex justify-center">
                      <img
                        src={step.image}
                        alt={step.alt}
                        className="max-w-full h-auto rounded-lg border shadow-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <Download className="h-6 w-6 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800 text-lg">Ready to optimize!</h4>
                <p className="text-green-700 mt-1">
                  Once you've downloaded your bulk template from Amazon, upload it above to get AI-powered optimization suggestions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AmazonGuide;
