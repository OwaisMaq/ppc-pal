
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, HelpCircle, BookOpen, ArrowRight } from "lucide-react";

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
        <Card className="border-2 border-dashed border-orange-300 hover:border-orange-400 transition-all duration-200 cursor-pointer group hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 group-hover:text-orange-800">
              <BookOpen className="h-5 w-5" />
              Amazon Data Download Guide
            </CardTitle>
            <CardDescription>
              Step-by-step instructions to download your bulk template from Amazon Advertising
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 rounded-full p-3 group-hover:bg-orange-200 transition-colors">
                  <HelpCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Need help getting your data?</p>
                  <p className="text-sm text-gray-600">Click to view the complete guide</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-orange-500 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>
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
