import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => (
          <li key={step.id} className="flex-1 relative">
            <div className="flex items-center">
              {/* Step circle */}
              <div
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200",
                  currentStep > step.id
                    ? "border-success bg-success text-success-foreground"
                    : currentStep === step.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.id}</span>
                )}
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors duration-200",
                    currentStep > step.id ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </div>

            {/* Step label */}
            <div className="mt-2">
              <span
                className={cn(
                  "text-sm font-medium block",
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {step.description}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
