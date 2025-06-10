
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
    <div className="grid md:grid-cols-3 gap-6 mt-12">
      {cards.map((card) => (
        <Card key={card.title} className="text-center">
          <CardContent className="pt-6">
            <card.icon className={`h-12 w-12 ${card.color} mx-auto mb-4`} />
            <h3 className="font-semibold mb-2">{card.title}</h3>
            <p className="text-sm text-gray-600">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InfoCards;
