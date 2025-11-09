import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bot, CheckCircle2, Shield, CalendarDays, Monitor } from "lucide-react";
import Win98Window from "@/components/Win98Window";

const PublicLanding = () => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    console.log('PublicLanding: Component mounted');
    console.log('PublicLanding: Current URL:', window.location.href);
    console.log('PublicLanding: Current pathname:', window.location.pathname);
    console.log('PublicLanding: User:', user?.email || 'No user', 'Loading:', loading);
    console.log('PublicLanding: This is a public page, no redirects should happen');
    document.title = 'PPC Pal — AI Amazon PPC Optimizer';
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-[#008080] text-foreground pb-16">
      {/* Windows 98 Taskbar */}
      <header 
        className="fixed top-0 z-50 w-full h-10 bg-[#C0C0C0] border-t-2 border-l-2 border-t-white border-l-white flex items-center px-1 gap-1"
        style={{
          borderRightColor: '#000000',
          borderBottomColor: '#000000',
        }}
      >
        <Button 
          size="sm" 
          className="h-8 gap-1 font-bold"
          style={{
            background: 'linear-gradient(90deg, #000080 0%, #1084D0 100%)',
            color: 'white',
            borderTopColor: '#FFFFFF',
            borderLeftColor: '#FFFFFF',
          }}
        >
          <Monitor className="h-4 w-4" />
          Start
        </Button>
        
        <div className="flex-1 flex items-center gap-1">
          <div className="h-8 px-3 flex items-center gap-2 bg-[#C0C0C0] border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-sm font-bold">
            <Bot className="h-4 w-4" />
            PPC Pal
          </div>
        </div>
        
        <div 
          className="h-8 px-3 flex items-center border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white text-xs font-bold"
          style={{
            boxShadow: 'inset -1px -1px 0 #DFDFDF, inset 1px 1px 0 #000000'
          }}
        >
          12:00 PM
        </div>
      </header>

      {/* Windows 98 Desktop Area */}
      <div className="pt-10 min-h-screen p-4">
        <div className="container mx-auto max-w-6xl">
          {/* Main Welcome Window */}
          <Win98Window title="Welcome to PPC Pal" className="mb-4">
            <div className="bg-white p-8 border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white">
              <div className="flex items-start gap-6 mb-6">
                <div className="w-16 h-16 bg-[#000080] flex items-center justify-center">
                  <Bot className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>
                    PPC Re-imagined.
                  </h1>
                  <p className="text-xl mb-2 font-bold">Delegate your Amazon ads to AI</p>
                  <p className="text-base text-gray-700">AI-driven bids • campaign management • keyword harvesting • day parting</p>
                </div>
              </div>
              
              <div className="flex gap-3 mb-6">
                {user ? (
                  <Link to="/dashboard">
                    <Button size="lg">
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link to="/auth">
                    <Button size="lg">
                      Join the beta
                    </Button>
                  </Link>
                )}
                <Link to="/about">
                  <Button variant="outline" size="lg">
                    Learn more
                  </Button>
                </Link>
              </div>
            </div>
          </Win98Window>

          {/* Dashboard Preview Window */}
          <Win98Window title="PPC Pal Dashboard.exe" className="mb-4">
            <div className="bg-white p-4 border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white">
              {/* Menu Bar */}
              <div className="bg-[#C0C0C0] mb-3 border-2 border-t-white border-l-white border-r-[#808080] border-b-[#808080] flex text-sm font-bold">
                <button className="px-3 py-1 hover:bg-[#000080] hover:text-white">File</button>
                <button className="px-3 py-1 hover:bg-[#000080] hover:text-white">View</button>
                <button className="px-3 py-1 hover:bg-[#000080] hover:text-white">Reports</button>
                <button className="px-3 py-1 hover:bg-[#000080] hover:text-white">Help</button>
              </div>

              {/* KPI Section */}
              <div className="mb-4 bg-[#C0C0C0] p-3 border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white p-3 border border-black">
                    <div className="text-xs font-bold mb-1">SPEND</div>
                    <div className="text-xl font-bold">$12.3k</div>
                    <div className="text-xs text-green-700">↓ 2.1%</div>
                  </div>
                  <div className="bg-white p-3 border border-black">
                    <div className="text-xs font-bold mb-1">CLICKS</div>
                    <div className="text-xl font-bold">48,921</div>
                    <div className="text-xs text-green-700">↑ 5.4%</div>
                  </div>
                  <div className="bg-white p-3 border border-black">
                    <div className="text-xs font-bold mb-1">ACOS</div>
                    <div className="text-xl font-bold">24.6%</div>
                    <div className="text-xs text-green-700">↓ 1.2%</div>
                  </div>
                  <div className="bg-white p-3 border border-black">
                    <div className="text-xs font-bold mb-1">ROAS</div>
                    <div className="text-xl font-bold">4.1x</div>
                    <div className="text-xs text-green-700">↑ 3.0%</div>
                  </div>
                </div>
              </div>

              {/* Chart Area */}
              <div className="bg-white p-4 border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white mb-3">
                <div className="flex items-center gap-2 mb-3 text-sm font-bold">
                  <CalendarDays className="h-4 w-4" />
                  Last 7 days
                </div>
                <div className="h-48 bg-[#C0C0C0] border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white flex items-center justify-center">
                  <div className="text-sm font-bold">Performance Graph</div>
                </div>
              </div>

              {/* Keywords List */}
              <div className="bg-white p-4 border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white">
                <div className="text-sm font-bold mb-3">TOP KEYWORDS</div>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-[#000080] text-white font-bold text-sm">
                    <span>organic vitamin c</span>
                    <span>ROAS 6.2x</span>
                  </div>
                  <div className="flex justify-between p-2 bg-[#C0C0C0] border border-black text-sm">
                    <span>kids gummies</span>
                    <span>ROAS 4.9x</span>
                  </div>
                  <div className="flex justify-between p-2 bg-[#C0C0C0] border border-black text-sm">
                    <span>beauty serum</span>
                    <span>ROAS 3.8x</span>
                  </div>
                </div>
              </div>
            </div>
          </Win98Window>

          {/* Features Window */}
          <Win98Window title="Features.txt - Notepad" className="mb-4">
            <div className="bg-white p-6 border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white font-mono text-sm">
              <div className="space-y-4">
                <div>
                  <div className="font-bold text-base mb-2">═══════════════════════════════════════</div>
                  <div className="font-bold text-lg mb-2">MAXIMISE ROAS, EVERY SINGLE DAY</div>
                  <div className="font-bold text-base mb-2">═══════════════════════════════════════</div>
                  <p className="mb-4">Our AI-powered optimization engine works 24/7 to ensure your campaigns perform at their peak.</p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-bold">Dynamic Bids</span>
                    </div>
                    <p className="ml-6">Continuous bid adjustments based on performance signals and market conditions.</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-bold">Keyword Harvesting</span>
                    </div>
                    <p className="ml-6">Automatically promote winning search terms while eliminating wasteful spend.</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-bold">Budget Pacing</span>
                    </div>
                    <p className="ml-6">Smart budget distribution prevents mid-day drop-offs and overspend scenarios.</p>
                  </div>
                </div>
              </div>
            </div>
          </Win98Window>

          {/* CTA Dialog Box */}
          <Win98Window title="System Message" className="max-w-md mx-auto mb-4">
            <div className="bg-[#C0C0C0] p-6">
              <div className="flex gap-4 mb-6">
                <div className="w-12 h-12 bg-[#000080] flex items-center justify-center flex-shrink-0">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div>
                  <div className="font-bold text-lg mb-2">Ready to transform your Amazon PPC?</div>
                  <div className="text-sm mb-3">Enterprise security & Amazon OAuth</div>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <Link to="/about">
                  <Button size="lg">Learn more</Button>
                </Link>
                {user ? (
                  <Link to="/dashboard">
                    <Button size="lg">Open dashboard</Button>
                  </Link>
                ) : (
                  <Link to="/auth">
                    <Button size="lg">Join the beta</Button>
                  </Link>
                )}
              </div>
            </div>
          </Win98Window>

          {/* Desktop Icons Area */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="flex flex-col items-center gap-2 p-2 hover:bg-[#000080]/20">
              <div className="w-12 h-12 bg-[#C0C0C0] border-2 border-t-white border-l-white border-r-black border-b-black flex items-center justify-center">
                <Bot className="h-8 w-8" />
              </div>
              <div className="text-xs font-bold text-white text-center" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                PPC Pal
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Windows 98 Footer/Taskbar Bottom Info */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#C0C0C0] border-t-2 border-t-white p-2 text-center text-xs font-bold">
        © 2024 WISH AND WILLOW LTD • PPC Pal v1.0 • All rights reserved
      </div>
    </div>
  );
};

export default PublicLanding;
