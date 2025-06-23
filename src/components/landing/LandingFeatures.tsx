
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Zap, Shield, Clock, Target, BarChart } from "lucide-react";

const LandingFeatures = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "Increase ROI",
      description: "Our AI algorithms identify the best performing keywords and optimize bids to maximize your return on ad spend.",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      icon: Zap,
      title: "Save Time",
      description: "Automate campaign optimization tasks that would take hours to do manually. Focus on growing your business instead.",
      color: "from-yellow-500 to-orange-500",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200"
    },
    {
      icon: Shield,
      title: "Data Security",
      description: "Your campaign data is encrypted and secure. We follow industry best practices to protect your business information.",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      icon: Clock,
      title: "Real-time Monitoring",
      description: "Get instant insights into your campaign performance with real-time data synchronization and alerts.",
      color: "from-purple-500 to-indigo-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      icon: Target,
      title: "Smart Targeting",
      description: "Advanced audience targeting and keyword discovery to reach the right customers at the right time.",
      color: "from-pink-500 to-rose-500",
      bgColor: "bg-pink-50",
      borderColor: "border-pink-200"
    },
    {
      icon: BarChart,
      title: "Detailed Analytics",
      description: "Comprehensive reporting and analytics to track your progress and identify optimization opportunities.",
      color: "from-indigo-500 to-blue-500",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200"
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Why Choose 
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> PPC Pal?</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our AI-powered platform delivers measurable results that matter to your business growth
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className={`${feature.bgColor} ${feature.borderColor} border-2 hover:shadow-xl transition-all duration-300 hover:scale-105 group relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="relative z-10">
                <div className={`bg-gradient-to-r ${feature.color} rounded-xl p-3 w-fit mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-gray-900 text-xl mb-3 group-hover:text-gray-800 transition-colors">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-gray-600 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;
