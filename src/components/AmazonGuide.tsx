
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
import { ChevronLeft, ChevronRight, Download, HelpCircle } from "lucide-react";

const AmazonGuide = () => {
  const [currentStep, setCurrentStep] = useState(0);
  
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

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          How to Download Amazon Bulk Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Amazon Bulk Template Download Guide
          </DialogTitle>
          <DialogDescription>
            Follow these steps to download your bulk template from Amazon Advertising
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{steps[currentStep].title}</h3>
                  <span className="text-sm text-gray-500">
                    {currentStep + 1} of {steps.length}
                  </span>
                </div>
                
                <p className="text-gray-600">{steps[currentStep].description}</p>
                
                <div className="flex justify-center">
                  <img
                    src={steps[currentStep].image}
                    alt={steps[currentStep].alt}
                    className="max-w-full h-auto rounded-lg border shadow-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep ? "bg-blue-600" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              onClick={nextStep}
              disabled={currentStep === steps.length - 1}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {currentStep === steps.length - 1 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Download className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">Ready to optimize!</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Once you've downloaded your bulk template from Amazon, upload it here to get AI-powered optimization suggestions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AmazonGuide;
