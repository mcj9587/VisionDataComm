import React, { useState } from 'react';
import { FieldView } from './components/FieldView';
import { DataView } from './components/DataView';
import { ChatPanel } from './components/ChatPanel';
import { Role, CapturedItem, ChatMessage, ProjectGoal } from './types';
import { SwitchCamera, Database } from 'lucide-react';

const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<Role>(Role.FIELD_ENGINEER);
  // Shared state acting as the database for this demo
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'ai', role: 'System', text: 'FactoryBridge Central Online. How can I assist with the inspection today?', timestamp: Date.now() }
  ]);

  // Goal State (Simulated Database)
  const [goals, setGoals] = useState<ProjectGoal[]>([
      { 
          id: 'g1', 
          title: 'Belt Wear Analysis', 
          targetCount: 50, 
          currentCount: 12, 
          deadline: '2025-04-10', 
          status: 'active',
          description: 'Collect diversified samples of belt fraying at >30% wear.' 
      },
      { 
          id: 'g2', 
          title: 'Motor Mounting Rust', 
          targetCount: 20, 
          currentCount: 18, 
          deadline: '2025-04-05', 
          status: 'at-risk',
          description: 'High priority: Identifying corrosion on Unit A-4 mounts.' 
      }
  ]);

  const toggleRole = () => {
    setCurrentRole(prev => prev === Role.FIELD_ENGINEER ? Role.DATA_SCIENTIST : Role.FIELD_ENGINEER);
  };

  const handleNewCapture = (item: CapturedItem) => {
    setCapturedItems(prev => [...prev, item]);
    // Auto-increment goals for demo purposes if matches
    if (item.analysis?.defectType.toLowerCase().includes('rust')) {
        setGoals(prev => prev.map(g => g.id === 'g2' ? {...g, currentCount: g.currentCount + 1} : g));
    } else {
        setGoals(prev => prev.map(g => g.id === 'g1' ? {...g, currentCount: g.currentCount + 1} : g));
    }
  };

  const handleSendMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 font-sans">
      {/* Role Switcher (Simulating App Navigation) */}
      <div className="absolute top-4 left-0 right-0 z-50 pointer-events-none flex justify-center">
         <div className="bg-slate-950/80 backdrop-blur border border-slate-700 rounded-full p-1.5 pointer-events-auto flex gap-1 shadow-2xl">
            <button 
              onClick={() => setCurrentRole(Role.FIELD_ENGINEER)}
              className={`px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition-all ${currentRole === Role.FIELD_ENGINEER ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50' : 'text-slate-400 hover:text-white'}`}
            >
              <SwitchCamera className="w-4 h-4" />
              FIELD OPS
            </button>
            <button 
              onClick={() => setCurrentRole(Role.DATA_SCIENTIST)}
              className={`px-5 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition-all ${currentRole === Role.DATA_SCIENTIST ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:text-white'}`}
            >
              <Database className="w-4 h-4" />
              DATA LAB
            </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full w-full relative">
        {currentRole === Role.FIELD_ENGINEER ? (
          <FieldView 
            onCapture={handleNewCapture} 
            onOpenChat={() => setIsChatOpen(true)}
          />
        ) : (
          <DataView 
            items={capturedItems} 
            goals={goals}
            onOpenChat={() => setIsChatOpen(true)}
          />
        )}
      </div>

      {/* Shared Chat Layer */}
      <ChatPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        messages={messages}
        onSendMessage={handleSendMessage}
        currentUserRole={currentRole}
      />
    </div>
  );
};

export default App;
