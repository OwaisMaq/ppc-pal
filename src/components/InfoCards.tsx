
import { Card, CardContent } from "@/components/ui/card";
import { Link, Zap, Monitor } from "lucide-react";

const InfoCards = () => {
  const cards = [
    {
      icon: Link,
      title: "1. Link Amazon Account",
      description: "Connect your Amazon Advertising account securely",
      color: "blue"
    },
    {
      icon: Zap,
      title: "2. AI Optimization",
      description: "AI analyzes and optimizes your campaigns automatically",
      color: "yellow"
    },
    {
      icon: Monitor,
      title: "3. Monitor & Control",
      description: "Track performance and maintain full control",
      color: "green"
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {cards.map((card) => (
        <Card key={card.title} className="text-center bg-white border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-6">
          <CardContent className="p-0 flex flex-col items-center justify-center">
            <div className={`rounded-full p-4 mb-6 ${
              card.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
              card.color === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
              'bg-gradient-to-r from-green-500 to-emerald-500'
            } shadow-lg`}>
              <card.icon className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-semibold text-xl mb-3 text-slate-900">{card.title}</h3>
            <p className="text-slate-600 leading-relaxed">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InfoCards;
