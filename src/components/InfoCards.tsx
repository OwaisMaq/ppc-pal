
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Zap, Download } from "lucide-react";

const InfoCards = () => {
  const cards = [
    {
      icon: Upload,
      title: "1. Upload Data",
      description: "Upload your Amazon advertising Excel workbook",
      color: "text-blue-600"
    },
    {
      icon: Zap,
      title: "2. AI Optimization",
      description: "AI analyzes and optimizes your campaigns and keywords",
      color: "text-yellow-600"
    },
    {
      icon: Download,
      title: "3. Download Results",
      description: "Get your optimized data in Excel format",
      color: "text-green-600"
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-4 mt-8">
      {cards.map((card) => (
        <Card key={card.title} className="text-center rounded-full p-3 h-32 w-32 mx-auto flex items-center justify-center">
          <CardContent className="p-0 flex flex-col items-center justify-center">
            <card.icon className={`h-6 w-6 ${card.color} mb-1`} />
            <h3 className="font-semibold text-xs mb-1">{card.title}</h3>
            <p className="text-xs text-gray-600 leading-tight">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InfoCards;
