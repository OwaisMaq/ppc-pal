import { cn } from "@/lib/utils";

interface HealthScoreCircleProps {
  score: number;
  grade: string;
  size?: "sm" | "md" | "lg";
  showGrade?: boolean;
}

function getGradeColor(grade: string) {
  switch (grade) {
    case "A":
      return "text-success";
    case "B":
      return "text-emerald-500";
    case "C":
      return "text-warning";
    case "D":
      return "text-orange-500";
    case "F":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

function getStrokeColor(grade: string) {
  switch (grade) {
    case "A":
      return "stroke-success";
    case "B":
      return "stroke-emerald-500";
    case "C":
      return "stroke-warning";
    case "D":
      return "stroke-orange-500";
    case "F":
      return "stroke-destructive";
    default:
      return "stroke-muted";
  }
}

export function HealthScoreCircle({ score, grade, size = "md", showGrade = true }: HealthScoreCircleProps) {
  const sizes = {
    sm: { width: 48, strokeWidth: 4, fontSize: "text-sm", gradeSize: "text-[10px]" },
    md: { width: 72, strokeWidth: 5, fontSize: "text-xl", gradeSize: "text-xs" },
    lg: { width: 96, strokeWidth: 6, fontSize: "text-3xl", gradeSize: "text-sm" },
  };

  const { width, strokeWidth, fontSize, gradeSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={width} height={width} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-500", getStrokeColor(grade))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold", fontSize, getGradeColor(grade))}>
          {score}
        </span>
        {showGrade && (
          <span className={cn("font-medium -mt-1", gradeSize, getGradeColor(grade))}>
            Grade {grade}
          </span>
        )}
      </div>
    </div>
  );
}
