
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProcessingProgressProps {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
}

const ProcessingProgress = ({ isProcessing, progress, currentStep }: ProcessingProgressProps) => {
  if (!isProcessing) return null;

  return (
    <Card className="mb-8 border-blue-200 bg-blue-50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">{currentStep}</span>
            <span className="text-sm text-blue-600">{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessingProgress;
