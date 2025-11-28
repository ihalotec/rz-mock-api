
import React from 'react';
import { Header } from '../../components/layout/Header';
import { Flag, Shuffle, Split } from 'lucide-react';

const Documentation = () => {
  return (
    <div className="min-h-screen bg-background text-gray-200">
      <Header />
      <div className="pt-24 pb-20 px-6 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-6">User Guide</h1>
        <p className="text-lg text-gray-400 mb-12">
          CastleMock Lite is a browser-based REST API mocking platform. 
          Learn how to manage endpoints, simulate latency, and define complex conditional responses.
        </p>

        <section className="mb-16">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm mr-3">1</span>
                Getting Started
            </h2>
            <div className="bg-[#16181d] border border-gray-800 rounded-xl p-6 space-y-4">
                <p>
                    <strong>1. Create a Project:</strong> On the dashboard, click "New Project". Give it a name (e.g., "Auth Service").
                </p>
                <p>
                    <strong>2. Add Endpoints:</strong> You can create endpoints manually using the <strong>+</strong> button in the sidebar, or import a full API specification.
                </p>
                <p>
                    <strong>3. Import Swagger/OpenAPI:</strong> Click the Upload icon in the sidebar. You can upload a <code>.json</code> file or provide a URL.
                </p>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm mr-3">2</span>
                Response Strategies
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#16181d] border border-gray-800 p-5 rounded-lg">
                    <Flag className="w-6 h-6 text-blue-400 mb-3" />
                    <h3 className="font-bold text-white mb-2">Default (Fixed)</h3>
                    <p className="text-sm text-gray-400">Always returns the single response marked as "Default". Good for static mocks.</p>
                </div>
                <div className="bg-[#16181d] border border-gray-800 p-5 rounded-lg">
                    <Shuffle className="w-6 h-6 text-purple-400 mb-3" />
                    <h3 className="font-bold text-white mb-2">Random</h3>
                    <p className="text-sm text-gray-400">Randomly selects one of the configured responses. Useful for testing flakey networks.</p>
                </div>
                <div className="bg-[#16181d] border border-gray-800 p-5 rounded-lg">
                    <Split className="w-6 h-6 text-orange-400 mb-3" />
                    <h3 className="font-bold text-white mb-2">Conditional</h3>
                    <p className="text-sm text-gray-400">Inspects the request body to decide which response to return based on your rules.</p>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm mr-3">3</span>
                Conditional Matching Logic
            </h2>
            <div className="space-y-6">
                <div className="bg-[#16181d] border border-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-white mb-2">JSON Path (Key == Value)</h3>
                    <p className="text-sm text-gray-400 mb-4">Matches specific fields within the JSON request body. Supports dot notation.</p>
                    <div className="bg-black/50 rounded p-4 font-mono text-xs text-green-400 space-y-2">
                        <div>role == 'admin'</div>
                        <div>user.isActive == true</div>
                        <div>items[0].id == 101</div>
                        <div>token <span className="text-gray-500">// Checks for existence</span></div>
                    </div>
                </div>

                <div className="bg-[#16181d] border border-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-white mb-2">JSON Body Subset</h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Performs a deep partial match. The request must contain at least the fields defined.
                    </p>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-black/50 rounded p-4">
                            <div className="text-xs text-gray-500 mb-2">Condition:</div>
                            <pre className="text-xs text-green-400 font-mono">{`{
  "type": "login",
  "payload": {
    "rememberMe": true
  }
}`}</pre>
                        </div>
                        <div className="flex-1 bg-black/50 rounded p-4">
                            <div className="text-xs text-gray-500 mb-2">Matches Request:</div>
                            <pre className="text-xs text-blue-400 font-mono">{`{
  "type": "login",
  "payload": { 
    "rememberMe": true, 
    "device": "mobile" 
  }
}`}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm mr-3">4</span>
                Example: Login Flow
            </h2>
            <div className="bg-[#16181d] border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h3 className="font-bold text-lg mb-2">Endpoint: POST /api/auth/login</h3>
                    <p className="text-sm text-gray-400">Setup multiple responses to simulate different login outcomes.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-24 shrink-0 text-xs font-bold uppercase py-1 bg-green-900/30 text-green-400 text-center rounded">200 OK</div>
                        <div>
                            <div className="font-semibold text-sm text-white">Success (Default)</div>
                            <div className="text-xs text-gray-500">Returns the auth token and user profile.</div>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-24 shrink-0 text-xs font-bold uppercase py-1 bg-red-900/30 text-red-400 text-center rounded">401</div>
                        <div>
                            <div className="font-semibold text-sm text-white">Invalid Password</div>
                            <div className="text-xs text-gray-500 mb-1">
                                Strategy: <span className="text-primary">Match Request</span> &rarr; <code>password == 'wrong_pass'</code>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-24 shrink-0 text-xs font-bold uppercase py-1 bg-red-900/30 text-red-400 text-center rounded">403</div>
                        <div>
                            <div className="font-semibold text-sm text-white">Account Locked</div>
                            <div className="text-xs text-gray-500 mb-1">
                                Strategy: <span className="text-primary">Body Subset</span> &rarr; <code>{`{ "options": { "forceLock": true } }`}</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
      </div>
    </div>
  );
};

export default Documentation;
