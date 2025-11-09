import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bot, CheckCircle2, Shield, CalendarDays, Search } from "lucide-react";
import WinXPWindow from "@/components/WinXPWindow";

const PublicLanding = () => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    console.log('PublicLanding: Component mounted');
    document.title = 'PPC Pal — AI Amazon PPC Optimizer';
  }, [user, loading]);

  return (
    <div className="min-h-screen text-foreground pb-16" style={{
      background: 'linear-gradient(180deg, #5FA3E8 0%, #2F7ED6 100%)',
    }}>
      {/* Windows XP Taskbar */}
      <header 
        className="fixed top-0 z-50 w-full h-10 flex items-center px-2 gap-2"
        style={{
          background: 'linear-gradient(180deg, #3A8DE8 0%, #1661C2 100%)',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
        }}
      >
        <button 
          className="h-8 px-3 rounded flex items-center gap-2 font-bold text-sm text-white shadow-md hover:brightness-110 transition-all"
          style={{
            background: 'linear-gradient(180deg, #8CD742 0%, #5AB313 100%)',
          }}
        >
          <div className="w-5 h-5 bg-white/20 rounded-sm flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-sm"></div>
          </div>
          start
        </button>
        
        <div className="flex-1 flex items-center gap-2">
          <div 
            className="h-8 px-3 flex items-center gap-2 text-sm font-semibold text-white rounded shadow-inner"
            style={{
              background: 'linear-gradient(180deg, #2F7ED6 0%, #1661C2 100%)',
            }}
          >
            <Bot className="h-4 w-4" />
            PPC Pal
          </div>
        </div>
        
        <div 
          className="h-8 px-3 flex items-center gap-2 rounded text-xs font-bold text-white shadow-inner"
          style={{
            background: 'linear-gradient(180deg, #2F7ED6 0%, #1661C2 100%)',
          }}
        >
          <div className="w-4 h-4 bg-[#FFE37A] rounded-sm"></div>
          12:00 PM
        </div>
      </header>

      {/* Windows XP Desktop with Bliss-style background */}
      <div className="pt-12 min-h-screen p-6">
        <div className="container mx-auto max-w-6xl">
          {/* Main Welcome Window */}
          <WinXPWindow title="Welcome to PPC Pal" className="mb-4 animate-fade-in">
            <div className="bg-gradient-to-br from-white to-[#ECF4FB] p-8 rounded-lg">
              <div className="flex items-start gap-6 mb-6">
                <div 
                  className="w-20 h-20 rounded-lg flex items-center justify-center shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #5FA3E8 0%, #2F7ED6 100%)',
                  }}
                >
                  <Bot className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h1 className="text-5xl font-bold mb-3 text-[#1E5DC8]" style={{ fontFamily: 'Tahoma, Arial, sans-serif' }}>
                    PPC Re-imagined.
                  </h1>
                  <p className="text-2xl mb-2 font-semibold text-[#2F7ED6]">Delegate your Amazon ads to AI</p>
                  <p className="text-base text-gray-700">AI-driven bids • campaign management • keyword harvesting • day parting</p>
                </div>
              </div>
              
              <div className="flex gap-3">
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
          </WinXPWindow>

          {/* Dashboard Preview Window */}
          <WinXPWindow title="PPC Pal Dashboard - Internet Explorer" className="mb-4 animate-fade-in">
            <div className="bg-white rounded-lg overflow-hidden">
              {/* Menu Bar - XP Style */}
              <div className="bg-gradient-to-b from-[#F0F0F0] to-[#D8D8D8] px-2 py-1 flex gap-3 text-sm font-normal border-b border-[#ACA899]">
                <button className="px-2 py-0.5 hover:bg-[#FFE6A2] hover:border hover:border-[#FFC83D] rounded">File</button>
                <button className="px-2 py-0.5 hover:bg-[#FFE6A2] hover:border hover:border-[#FFC83D] rounded">View</button>
                <button className="px-2 py-0.5 hover:bg-[#FFE6A2] hover:border hover:border-[#FFC83D] rounded">Reports</button>
                <button className="px-2 py-0.5 hover:bg-[#FFE6A2] hover:border hover:border-[#FFC83D] rounded">Help</button>
              </div>

              {/* Address Bar */}
              <div className="bg-gradient-to-b from-[#F0F0F0] to-[#D8D8D8] p-2 flex items-center gap-2 border-b border-[#ACA899]">
                <span className="text-xs font-semibold text-gray-700">Address</span>
                <div className="flex-1 bg-white border border-[#5B9DD6] rounded px-2 py-1 text-sm flex items-center gap-2">
                  <Search className="h-3 w-3 text-gray-500" />
                  <span className="text-gray-700">https://ppcpal.app/dashboard</span>
                </div>
              </div>

              <div className="p-4">
                {/* KPI Section */}
                <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-white to-[#E8F3FD] p-4 rounded-lg border border-[#5B9DD6] shadow-md">
                    <div className="text-xs font-bold text-[#1E5DC8] mb-1">SPEND</div>
                    <div className="text-2xl font-bold text-[#2F7ED6]">$12.3k</div>
                    <div className="text-xs text-green-600 font-semibold">↓ 2.1%</div>
                  </div>
                  <div className="bg-gradient-to-br from-white to-[#E8F3FD] p-4 rounded-lg border border-[#5B9DD6] shadow-md">
                    <div className="text-xs font-bold text-[#1E5DC8] mb-1">CLICKS</div>
                    <div className="text-2xl font-bold text-[#2F7ED6]">48,921</div>
                    <div className="text-xs text-green-600 font-semibold">↑ 5.4%</div>
                  </div>
                  <div className="bg-gradient-to-br from-white to-[#E8F3FD] p-4 rounded-lg border border-[#5B9DD6] shadow-md">
                    <div className="text-xs font-bold text-[#1E5DC8] mb-1">ACOS</div>
                    <div className="text-2xl font-bold text-[#2F7ED6]">24.6%</div>
                    <div className="text-xs text-green-600 font-semibold">↓ 1.2%</div>
                  </div>
                  <div className="bg-gradient-to-br from-white to-[#E8F3FD] p-4 rounded-lg border border-[#5B9DD6] shadow-md">
                    <div className="text-xs font-bold text-[#1E5DC8] mb-1">ROAS</div>
                    <div className="text-2xl font-bold text-[#2F7ED6]">4.1x</div>
                    <div className="text-xs text-green-600 font-semibold">↑ 3.0%</div>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="bg-gradient-to-br from-white to-[#F0F8FF] p-4 rounded-lg border border-[#5B9DD6] mb-4 shadow-md">
                  <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-[#1E5DC8]">
                    <CalendarDays className="h-4 w-4" />
                    Last 7 days
                  </div>
                  <div className="h-48 bg-gradient-to-br from-[#E8F3FD] to-white rounded-lg border border-[#5B9DD6] flex items-center justify-center shadow-inner">
                    <div className="text-sm font-semibold text-[#2F7ED6]">📊 Performance Graph</div>
                  </div>
                </div>

                {/* Keywords List */}
                <div className="bg-gradient-to-br from-white to-[#F0F8FF] p-4 rounded-lg border border-[#5B9DD6] shadow-md">
                  <div className="text-sm font-bold mb-3 text-[#1E5DC8]">TOP KEYWORDS</div>
                  <div className="space-y-2">
                    <div 
                      className="flex justify-between p-3 text-white font-semibold text-sm rounded shadow-md"
                      style={{
                        background: 'linear-gradient(180deg, #5FA3E8 0%, #2F7ED6 100%)',
                      }}
                    >
                      <span>organic vitamin c</span>
                      <span>ROAS 6.2x</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gradient-to-b from-white to-[#F0F8FF] border border-[#5B9DD6] rounded text-sm">
                      <span>kids gummies</span>
                      <span className="font-semibold">ROAS 4.9x</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gradient-to-b from-white to-[#F0F8FF] border border-[#5B9DD6] rounded text-sm">
                      <span>beauty serum</span>
                      <span className="font-semibold">ROAS 3.8x</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </WinXPWindow>

          {/* Features Window - Notepad Style */}
          <WinXPWindow title="Features - Notepad" className="mb-4 animate-fade-in">
            <div className="bg-white p-6 rounded-lg font-mono text-sm">
              <div className="space-y-4">
                <div className="border-l-4 border-[#2F7ED6] pl-4">
                  <div className="font-bold text-xl mb-2 text-[#1E5DC8]">MAXIMISE ROAS, EVERY SINGLE DAY</div>
                  <p className="mb-4 text-gray-700">Our AI-powered optimization engine works 24/7 to ensure your campaigns perform at their peak.</p>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-[#E8F3FD] to-transparent p-3 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-5 w-5 text-[#73D216]" />
                      <span className="font-bold text-[#1E5DC8]">Dynamic Bids</span>
                    </div>
                    <p className="ml-7 text-gray-700">Continuous bid adjustments based on performance signals and market conditions.</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-[#E8F3FD] to-transparent p-3 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-5 w-5 text-[#73D216]" />
                      <span className="font-bold text-[#1E5DC8]">Keyword Harvesting</span>
                    </div>
                    <p className="ml-7 text-gray-700">Automatically promote winning search terms while eliminating wasteful spend.</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-[#E8F3FD] to-transparent p-3 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-5 w-5 text-[#73D216]" />
                      <span className="font-bold text-[#1E5DC8]">Budget Pacing</span>
                    </div>
                    <p className="ml-7 text-gray-700">Smart budget distribution prevents mid-day drop-offs and overspend scenarios.</p>
                  </div>
                </div>
              </div>
            </div>
          </WinXPWindow>

          {/* CTA Dialog Box */}
          <WinXPWindow title="Message from PPC Pal" className="max-w-md mx-auto mb-4 animate-fade-in">
            <div className="bg-gradient-to-br from-white to-[#ECF4FB] p-6 rounded-lg">
              <div className="flex gap-4 mb-6">
                <div 
                  className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #5FA3E8 0%, #2F7ED6 100%)',
                  }}
                >
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div>
                  <div className="font-bold text-lg mb-2 text-[#1E5DC8]">Ready to transform your Amazon PPC?</div>
                  <div className="text-sm text-gray-700">Enterprise security & Amazon OAuth</div>
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
          </WinXPWindow>

          {/* Desktop Icons Area */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <button className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/20 transition-all group">
              <div 
                className="w-16 h-16 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow"
                style={{
                  background: 'linear-gradient(135deg, #5FA3E8 0%, #2F7ED6 100%)',
                }}
              >
                <Bot className="h-10 w-10 text-white" />
              </div>
              <div className="text-sm font-bold text-white text-center drop-shadow-lg">
                PPC Pal
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Windows XP Taskbar Bottom */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-10 flex items-center justify-between px-4 text-xs font-semibold text-white"
        style={{
          background: 'linear-gradient(180deg, #3A8DE8 0%, #1661C2 100%)',
          boxShadow: '0 -1px 4px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#FFE37A] rounded-sm shadow-sm"></div>
          <span>© 2024 WISH AND WILLOW LTD • PPC Pal v1.0</span>
        </div>
        <div>All rights reserved</div>
      </div>
    </div>
  );
};

export default PublicLanding;
