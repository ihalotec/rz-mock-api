
import React, { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Flag, Shuffle, Split, ChevronRight, Hash, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const sections = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'response-strategies', title: 'Response Strategies' },
  { id: 'matching-logic', title: 'Conditional Matching' },
  { id: 'example-login', title: 'Example: Login Flow' },
];

const Documentation = () => {
  const [activeSection, setActiveSection] = useState('getting-started');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -60% 0px' }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-200">
      <Header />
      
      <div className="pt-20 max-w-7xl mx-auto px-6 flex items-start gap-12">
        {/* Main Content */}
        <div className="flex-1 pb-20 min-w-0">
            <div className="mb-12 border-b border-gray-800 pb-8">
                <h1 className="text-4xl font-bold text-white mb-4">User Guide</h1>
                <p className="text-xl text-gray-400">
                Master CastleMock Lite to simulate APIs, mock edge cases, and test your frontend without a real backend.
                </p>
            </div>

            <section id="getting-started" className="mb-20 scroll-mt-24">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                    Getting Started
                </h2>
                <div className="bg-[#16181d] border border-gray-800 rounded-xl p-8 space-y-6">
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">1</div>
                        <div>
                            <h3 className="font-semibold text-white mb-1">Create a Project</h3>
                            <p className="text-gray-400 text-sm">On the dashboard, click "New Project". This acts as a workspace for a specific API (e.g., "Payment Gateway").</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">2</div>
                        <div>
                            <h3 className="font-semibold text-white mb-1">Define Endpoints</h3>
                            <p className="text-gray-400 text-sm">
                                Use the sidebar to create endpoints manually, or click the <span className="inline-block bg-gray-800 px-1 rounded mx-1">Upload</span> icon to import a Swagger/OpenAPI file.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">3</div>
                        <div>
                            <h3 className="font-semibold text-white mb-1">Run the Server</h3>
                            <p className="text-gray-400 text-sm">
                                Click <span className="text-green-400 font-mono text-xs border border-green-900/30 bg-green-900/10 px-1 py-0.5 rounded">Run Server</span> in the header to activate the mock engine. Requests to <code>/mock/[projectId]/...</code> will now be intercepted.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="response-strategies" className="mb-20 scroll-mt-24">
                <h2 className="text-2xl font-bold text-white mb-6">Response Strategies</h2>
                <p className="text-gray-400 mb-6">
                    An endpoint can have multiple saved responses (e.g., 200 OK, 400 Bad Request). 
                    The <strong>Strategy</strong> determines which one is served.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#16181d] border border-gray-800 p-6 rounded-lg hover:border-blue-500/50 transition-colors group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <Flag className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-white">Default (Fixed)</h3>
                        </div>
                        <p className="text-sm text-gray-400">
                            Always serves the response marked as "Default". Perfect for simple, static mocking where you just need the happy path.
                        </p>
                    </div>
                    
                    <div className="bg-[#16181d] border border-gray-800 p-6 rounded-lg hover:border-purple-500/50 transition-colors group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                <Shuffle className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-white">Random</h3>
                        </div>
                        <p className="text-sm text-gray-400">
                            Randomly selects one of the configured responses. Useful for Chaos Engineering—testing how your app handles 500 errors or flaky responses.
                        </p>
                    </div>

                    <div className="bg-[#16181d] border border-gray-800 p-6 rounded-lg col-span-1 md:col-span-2 hover:border-orange-500/50 transition-colors group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <Split className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-white">Match Request (Conditional)</h3>
                        </div>
                        <p className="text-sm text-gray-400">
                            The most powerful mode. It inspects the incoming request body and serves a specific response if the rules match. 
                            This allows a single endpoint to behave "smartly" (e.g., accepting correct passwords but rejecting wrong ones).
                        </p>
                    </div>
                </div>
            </section>

            <section id="matching-logic" className="mb-20 scroll-mt-24">
                <h2 className="text-2xl font-bold text-white mb-6">Conditional Matching</h2>
                
                <div className="space-y-8">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3 border-l-4 border-primary pl-3">1. JSON Path (Key == Value)</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Target specific fields in the JSON body using dot notation. You can check for equality, inequality, or simple existence.
                        </p>
                        <div className="bg-black/50 border border-gray-800 rounded-lg overflow-hidden">
                            <div className="grid grid-cols-[1fr,2fr] text-sm">
                                <div className="px-4 py-2 bg-gray-900/50 text-gray-500 border-b border-gray-800 font-mono text-xs uppercase tracking-wider">Expression</div>
                                <div className="px-4 py-2 bg-gray-900/50 text-gray-500 border-b border-gray-800 font-mono text-xs uppercase tracking-wider">Description</div>
                                
                                <div className="px-4 py-3 font-mono text-green-400 border-b border-gray-800/50">role == 'admin'</div>
                                <div className="px-4 py-3 text-gray-400 border-b border-gray-800/50">Matches if <code>role</code> property equals string "admin".</div>
                                
                                <div className="px-4 py-3 font-mono text-green-400 border-b border-gray-800/50">user.isActive == true</div>
                                <div className="px-4 py-3 text-gray-400 border-b border-gray-800/50">Checks nested object property.</div>

                                <div className="px-4 py-3 font-mono text-green-400 border-b border-gray-800/50">items[0].id == 101</div>
                                <div className="px-4 py-3 text-gray-400 border-b border-gray-800/50">Checks the ID of the first item in an array.</div>
                                
                                <div className="px-4 py-3 font-mono text-green-400 border-b border-gray-800/50">count != 0</div>
                                <div className="px-4 py-3 text-gray-400 border-b border-gray-800/50">Matches if <code>count</code> is NOT 0.</div>

                                <div className="px-4 py-3 font-mono text-green-400">token</div>
                                <div className="px-4 py-3 text-gray-400">Matches if <code>token</code> key simply exists and is not null.</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-white mb-3 border-l-4 border-purple-500 pl-3">2. JSON Body Subset</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Matches by structure. The request must contain at least the fields you define. Useful for matching complex objects without writing long paths.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#16181d] border border-gray-800 rounded p-4">
                                <div className="text-xs text-purple-400 font-bold mb-2 uppercase">Your Condition</div>
                                <pre className="text-xs text-gray-300 font-mono">{`{
  "type": "login",
  "data": {
    "remember": true
  }
}`}</pre>
                            </div>
                            <div className="bg-[#16181d] border border-gray-800 rounded p-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-bl">MATCHES</div>
                                <div className="text-xs text-gray-500 font-bold mb-2 uppercase">Incoming Request</div>
                                <pre className="text-xs text-gray-300 font-mono opacity-60">{`{
  "type": "login",
  "timestamp": 123456,
  "data": { 
    "remember": true, 
    "device": "ios" 
  }
}`}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="example-login" className="mb-20 scroll-mt-24">
                <h2 className="text-2xl font-bold text-white mb-6">Example: Login Simulation</h2>
                <div className="bg-gradient-to-br from-gray-900 to-[#16181d] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-gray-800 bg-gray-900/80 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-green-400 font-bold">POST</span>
                            <span className="text-gray-300">/api/auth/login</span>
                        </div>
                        <div className="text-xs text-gray-500">End-to-end scenario</div>
                    </div>
                    
                    <div className="p-6 grid gap-6">
                        {/* Scenario 1 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-gray-600 mb-1" />
                                <div className="w-0.5 h-full bg-gray-800" />
                            </div>
                            <div className="pb-6">
                                <h4 className="text-white font-semibold flex items-center gap-2">
                                    1. Happy Path <span className="text-xs font-normal text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">Default</span>
                                </h4>
                                <p className="text-sm text-gray-400 mt-1 mb-2">If no special data is sent, allow login.</p>
                                <div className="bg-black/40 rounded p-3 text-xs font-mono text-gray-300 border border-gray-800/50">
                                    Returns 200 OK with <code>{`{ "token": "xyz..." }`}</code>
                                </div>
                            </div>
                        </div>

                        {/* Scenario 2 */}
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-primary mb-1" />
                                <div className="w-0.5 h-full bg-gray-800" />
                            </div>
                            <div className="pb-6">
                                <h4 className="text-white font-semibold flex items-center gap-2">
                                    2. Wrong Password <span className="text-xs font-normal text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">Condition</span>
                                </h4>
                                <div className="mt-2 mb-2 flex items-center gap-2 text-xs font-mono">
                                    <span className="text-gray-500">IF</span>
                                    <span className="bg-gray-800 px-2 py-1 rounded text-green-400">password == 'wrong'</span>
                                </div>
                                <div className="bg-black/40 rounded p-3 text-xs font-mono text-red-300 border border-red-900/30 bg-red-900/5">
                                    Returns 401 Unauthorized with <code>{`{ "error": "Invalid credentials" }`}</code>
                                </div>
                            </div>
                        </div>

                        {/* Scenario 3 */}
                        <div className="flex gap-4">
                             <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-purple-500" />
                            </div>
                            <div>
                                <h4 className="text-white font-semibold flex items-center gap-2">
                                    3. Locked Account <span className="text-xs font-normal text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">Subset</span>
                                </h4>
                                <div className="mt-2 mb-2 flex items-center gap-2 text-xs font-mono">
                                    <span className="text-gray-500">IF BODY CONTAINS</span>
                                    <span className="bg-gray-800 px-2 py-1 rounded text-purple-300">{`{ "options": { "simulateLock": true } }`}</span>
                                </div>
                                <div className="bg-black/40 rounded p-3 text-xs font-mono text-yellow-300 border border-yellow-900/30 bg-yellow-900/5">
                                    Returns 403 Forbidden with <code>{`{ "error": "User locked" }`}</code>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        {/* Sticky TOC Sidebar */}
        <div className="w-64 shrink-0 hidden lg:block sticky top-24">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-3">On this page</h4>
            <nav className="space-y-1 border-l border-gray-800">
                {sections.map(section => (
                    <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                            "block w-full text-left px-4 py-2 text-sm transition-all border-l-2 -ml-[2px]",
                            activeSection === section.id 
                                ? "border-primary text-primary font-medium bg-primary/5" 
                                : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"
                        )}
                    >
                        {section.title}
                    </button>
                ))}
            </nav>

            <div className="mt-8 p-4 bg-[#16181d] rounded-lg border border-gray-800">
                <h5 className="text-xs font-bold text-white mb-2">Need Help?</h5>
                <p className="text-xs text-gray-500 mb-3">Check the Console for runtime logs or restart the server.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
