
import { Card, CardContent } from "@/components/ui/card";
import { Upload, BarChart3, Download } from "lucide-react";

const InfoCards = () => {
  const cards = [
    {
      icon: Upload,
      title: "1. Upload Data",
      description: "Upload your Amazon advertising Excel workbook",
      color: "text-accent-blue"
    },
    {
      icon: BarChart3,
      title: "2. Performance Analysis",
      description: "Analyze campaign performance and identify optimization opportunities",
      color: "text-accent-amber"
    },
    {
      icon: Download,
      title: "3. Download Results",
      description: "Get your optimized data in Excel format",
      color: "text-accent-emerald"
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-4 mt-8">
      {cards.map((card) => (
        <Card key={card.title} className="text-center rounded-full p-3 h-32 w-32 mx-auto flex items-center justify-center">
          <CardContent className="p-0 flex flex-col items-center justify-center">
            <card.icon className={`h-6 w-6 ${card.color} mb-1`} />
            <h3 className="font-semibold text-xs mb-1">{card.title}</h3>
            <p className="text-xs text-muted-foreground leading-tight">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InfoCards;
