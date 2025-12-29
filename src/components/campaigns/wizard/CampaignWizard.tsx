import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { StepIndicator } from "./StepIndicator";
import { TemplateSelector, TemplateType, templates } from "./TemplateSelector";
import { 
  ArrowLeft, 
  ArrowRight, 
  Package, 
  DollarSign, 
  CheckCircle2,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  AlertCircle
} from "lucide-react";

interface CampaignWizardProps {
  profileId: string;
  onComplete?: () => void;
}

const steps = [
  { id: 1, title: "Product", description: "Select ASIN" },
  { id: 2, title: "Strategy", description: "Choose template" },
  { id: 3, title: "Budget", description: "Set spending" },
  { id: 4, title: "Review", description: "Launch" },
];

interface FormData {
  asin: string;
  productName: string;
  productPrice: number;
  templateType: TemplateType;
  dailyBudget: number;
  defaultBid: number;
  enableHarvesting: boolean;
  enableNegatives: boolean;
}

export function CampaignWizard({ profileId, onComplete }: CampaignWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    asin: "",
    productName: "",
    productPrice: 0,
    templateType: "balanced",
    dailyBudget: 50,
    defaultBid: 0.75,
    enableHarvesting: true,
    enableNegatives: true,
  });

  const createCampaignSet = useMutation({
    mutationFn: async (data: FormData) => {
      const { data: result, error } = await supabase.functions.invoke("create-campaign-set", {
        body: {
          profileId,
          asin: data.asin,
          productName: data.productName,
          productPrice: data.productPrice,
          templateType: data.templateType,
          dailyBudget: data.dailyBudget,
          defaultBid: data.defaultBid,
          enableHarvesting: data.enableHarvesting,
          enableNegatives: data.enableNegatives,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Campaign set created!",
        description: `Created ${data.campaignsCreated?.length || 4} campaigns with auto-harvesting rules.`,
      });
      onComplete?.();
      navigate("/campaigns");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create campaign set",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTemplateSelect = (template: TemplateType) => {
    const selectedTemplate = templates.find((t) => t.id === template);
    if (selectedTemplate) {
      setFormData({
        ...formData,
        templateType: template,
        dailyBudget: selectedTemplate.dailyBudget,
        defaultBid: selectedTemplate.defaultBid,
      });
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.asin.length >= 10 && formData.productName.length > 0;
      case 2:
        return true;
      case 3:
        return formData.dailyBudget >= 10 && formData.defaultBid >= 0.1;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      createCampaignSet.mutate(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <StepIndicator steps={steps} currentStep={currentStep} />

      <Card className="border-border">
        <CardContent className="pt-6">
          {/* Step 1: Product Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Package className="h-12 w-12 mx-auto mb-3 text-primary" />
                <h2 className="text-xl font-semibold">Select Your Product</h2>
                <p className="text-muted-foreground">
                  Enter the ASIN you want to advertise
                </p>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="asin">ASIN</Label>
                  <Input
                    id="asin"
                    placeholder="B0XXXXXXXXX"
                    value={formData.asin}
                    onChange={(e) =>
                      setFormData({ ...formData, asin: e.target.value.toUpperCase() })
                    }
                    className="text-center text-lg font-mono"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    10-character Amazon Standard Identification Number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    placeholder="Premium Widget Pro 2024"
                    value={formData.productName}
                    onChange={(e) =>
                      setFormData({ ...formData, productName: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productPrice">Product Price ($)</Label>
                  <Input
                    id="productPrice"
                    type="number"
                    placeholder="29.99"
                    value={formData.productPrice || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, productPrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to calculate recommended bids and ACoS targets
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Template Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Sparkles className="h-12 w-12 mx-auto mb-3 text-primary" />
                <h2 className="text-xl font-semibold">Choose Your Strategy</h2>
                <p className="text-muted-foreground">
                  Select a campaign template that matches your goals
                </p>
              </div>

              <TemplateSelector
                selectedTemplate={formData.templateType}
                onSelectTemplate={handleTemplateSelect}
              />
            </div>
          )}

          {/* Step 3: Budget Settings */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <DollarSign className="h-12 w-12 mx-auto mb-3 text-primary" />
                <h2 className="text-xl font-semibold">Set Your Budget</h2>
                <p className="text-muted-foreground">
                  Configure daily spending and default bids
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Daily Budget</Label>
                    <span className="text-2xl font-bold text-primary">
                      ${formData.dailyBudget}
                    </span>
                  </div>
                  <Slider
                    value={[formData.dailyBudget]}
                    onValueChange={([value]) =>
                      setFormData({ ...formData, dailyBudget: value })
                    }
                    min={10}
                    max={500}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>$10</span>
                    <span>$500</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Default Bid</Label>
                    <span className="text-2xl font-bold text-primary">
                      ${formData.defaultBid.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[formData.defaultBid * 100]}
                    onValueChange={([value]) =>
                      setFormData({ ...formData, defaultBid: value / 100 })
                    }
                    min={10}
                    max={500}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>$0.10</span>
                    <span>$5.00</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Harvesting Rules</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically promote winning search terms
                      </p>
                    </div>
                    <Switch
                      checked={formData.enableHarvesting}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, enableHarvesting: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Negative Keyword Isolation</Label>
                      <p className="text-xs text-muted-foreground">
                        Prevent internal keyword competition
                      </p>
                    </div>
                    <Switch
                      checked={formData.enableNegatives}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, enableNegatives: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Launch */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
                <h2 className="text-xl font-semibold">Review & Launch</h2>
                <p className="text-muted-foreground">
                  Confirm your campaign set configuration
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Product
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-mono text-lg">{formData.asin}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {formData.productName}
                    </p>
                    {formData.productPrice > 0 && (
                      <p className="text-sm font-medium mt-1">
                        ${formData.productPrice.toFixed(2)}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary" className="capitalize">
                      {formData.templateType}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {templates.find((t) => t.id === formData.templateType)?.description}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Budget
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">${formData.dailyBudget}/day</p>
                    <p className="text-sm text-muted-foreground">
                      Default bid: ${formData.defaultBid.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Automation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex items-center gap-2">
                      {formData.enableHarvesting ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">Auto-harvesting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {formData.enableNegatives ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">Negative isolation</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/30 border border-border rounded-lg p-4 max-w-2xl mx-auto">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Campaigns to be created:
                </h3>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">SP Auto</Badge>
                    Automatic targeting for keyword discovery
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">SP Broad</Badge>
                    Manual keywords - broad match
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">SP Exact</Badge>
                    Manual keywords - exact match (winners)
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">SP PAT</Badge>
                    Product targeting (competitor ASINs)
                  </li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed() || createCampaignSet.isPending}
        >
          {createCampaignSet.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : currentStep === 4 ? (
            <>
              Launch Campaigns
              <Sparkles className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
