
import { Card, CardContent } from "@/components/ui/card";
import { Link, Zap, Monitor } from "lucide-react";

const InfoCards = () => {
  const cards = [
    {
      icon: Link,
      title: "1. Link Amazon Account",
      description: "Connect your Amazon Advertising account securely",
      color: "text-blue-600"
    },
    {
      icon: Zap,
      title: "2. AI Optimization",
      description: "AI analyzes and optimizes your campaigns automatically",
      color: "text-yellow-600"
    },
    {
      icon: Monitor,
      title: "3. Monitor & Control",
      description: "Track performance and maintain full control",
      color: "text-green-600"
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-8 mt-8">
      {cards.map((card) => (
        <Card key={card.title} className="text-center bg-black/20 backdrop-blur-md border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20 p-6">
          <CardContent className="p-0 flex flex-col items-center justify-center">
            <div className={`rounded-full p-3 mb-4 bg-gradient-to-r ${card.color === 'text-blue-600' ? 'from-blue-500 to-cyan-500' : card.color === 'text-yellow-600' ? 'from-yellow-500 to-orange-500' : 'from-green-500 to-emerald-500'} shadow-lg`}>
              <card.icon className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-white">{card.title}</h3>
            <p className="text-sm text-purple-200 leading-relaxed">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InfoCards;
