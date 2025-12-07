import React, { useState, useEffect } from 'react';
import { CapturedItem, ProjectGoal } from '../types';
import { generateDatasetReport, generateInspectionVideo } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Bot, FileText, Filter, LayoutDashboard, ListTodo, Activity, MessageSquare, Box, Layers, Image as ImageIcon, ChevronRight, X, Play, RotateCw, Video, Film, Info, Camera, Zap } from 'lucide-react';
import { CoverageVisualization } from './CoverageVisualization';

interface DataViewProps {
  items: CapturedItem[];
  goals: ProjectGoal[];
  onOpenChat: () => void;
}

export const DataView: React.FC<DataViewProps> = ({ items, goals, onOpenChat }) => {
  const [report, setReport] = useState<string>("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'gallery' | 'reconstruction'>('dashboard');
  
  // 3D Gen State
  const [modelStatus, setModelStatus] = useState<'idle' | 'generating' | 'ready'>('idle');
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  // Video Gen State (3D View)
  const [viewMode, setViewMode] = useState<'3d' | 'video'>('3d');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);

  // Video Gen State (Dashboard)
  const [dashboardVideoUrl, setDashboardVideoUrl] = useState<string | null>(null);
  const [isDashboardVideoGenerating, setIsDashboardVideoGenerating] = useState(false);

  // Stats Calculation
  const defectCounts = items.reduce((acc, item) => {
    const type = item.analysis?.defectType || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(defectCounts).map(key => ({
    name: key,
    value: defectCounts[key]
  }));

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const qualityPercentage = items.length > 0 ? Math.round((items.filter(i => i.analysis?.isQualitySufficient).length / items.length) * 100) : 0;

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    const r = await generateDatasetReport(items);
    setReport(r);
    setIsGeneratingReport(false);
  };

  const handleGenerateModel = () => {
      setModelStatus('generating');
      // Simulate Gemini generation delay for 3D simulation
      setTimeout(() => {
          setModelStatus('ready');
      }, 3500);
  };

  // Helper to check Veo API Key
  const checkVeoKey = async () => {
      // @ts-ignore
      if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
      }
  }

  const handleGenerateVideo = async () => {
      if (items.length === 0) return;
      await checkVeoKey();

      setIsVideoGenerating(true);
      try {
          // Prioritize image from selected part, otherwise last image
          const relevantItems = selectedPart 
            ? items.filter(i => i.metadata.component.includes(selectedPart))
            : items;
            
          const targetItem = relevantItems.length > 0 ? relevantItems[relevantItems.length - 1] : items[items.length - 1];
          const base64Data = targetItem.imageUrl.split(',')[1];
          const componentName = targetItem.metadata.component || "industrial component";
          const defectContext = targetItem.analysis?.defectType !== 'None' ? `showing ${targetItem.analysis?.defectType}` : "pristine condition";
          
          const vidUrl = await generateInspectionVideo(
              base64Data, 
              `Cinematic drone orbit shot of ${componentName}, ${defectContext}, highly detailed, 8k, photorealistic, manufacturing hangar background, slow smooth motion`
          );
          if (vidUrl) {
              setGeneratedVideoUrl(vidUrl);
          }
      } catch (e) {
          console.error("Failed to generate video", e);
          alert("Video generation failed. Please check console.");
      } finally {
          setIsVideoGenerating(false);
      }
  };

  const handleGenerateDashboardVideo = async () => {
    if (items.length === 0) return;
    await checkVeoKey();

    setIsDashboardVideoGenerating(true);
    try {
        // Find the most critical item to highlight
        const criticalItem = items.find(i => i.analysis?.severity === 'Critical') 
                          || items.find(i => i.analysis?.severity === 'High') 
                          || items[items.length - 1];

        const base64Data = criticalItem.imageUrl.split(',')[1];
        const componentName = criticalItem.metadata.component;
        
        const vidUrl = await generateInspectionVideo(
            base64Data, 
            `Cinematic flyover of industrial ${componentName}, dramatic lighting, 4k, slow motion inspection view.`
        );
        if (vidUrl) {
            setDashboardVideoUrl(vidUrl);
        }
    } catch (e) {
        console.error("Failed to generate dashboard video", e);
    } finally {
        setIsDashboardVideoGenerating(false);
    }
  };

  // Toggle Video Mode Logic
  useEffect(() => {
    if (viewMode === 'video' && !generatedVideoUrl && !isVideoGenerating) {
        handleGenerateVideo();
    }
  }, [viewMode]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
             <div className="bg-cyan-900/30 p-2 rounded text-cyan-400">
                 <LayoutDashboard className="w-5 h-5" />
             </div>
             <div>
                <h1 className="text-lg font-bold text-white tracking-wide">MISSION CONTROL</h1>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Dataset Operations Center</p>
             </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex bg-slate-800 rounded-lg p-1">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <Activity className="w-3 h-3" /> Overview
                </button>
                 <button 
                    onClick={() => setActiveTab('reconstruction')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'reconstruction' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <Box className="w-3 h-3" /> 3D Model
                </button>
                <button 
                    onClick={() => setActiveTab('gallery')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'gallery' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <Layers className="w-3 h-3" /> Gallery
                </button>
            </div>
            <button 
                onClick={onOpenChat}
                className="p-2 text-slate-400 hover:text-white border-l border-slate-700 pl-4"
            >
                <MessageSquare className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 relative">
        
        {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-slate-400 text-xs font-bold uppercase">Total Samples</p>
                                <Activity className="w-4 h-4 text-cyan-500" />
                            </div>
                            <p className="text-4xl font-mono text-white">{items.length}</p>
                            <p className="text-xs text-slate-500 mt-1">+12% from yesterday</p>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-slate-400 text-xs font-bold uppercase">Quality Score</p>
                                <div className={`w-2 h-2 rounded-full ${qualityPercentage > 80 ? 'bg-green-500' : 'bg-orange-500'}`} />
                            </div>
                            <p className={`text-4xl font-mono ${qualityPercentage > 80 ? 'text-green-400' : 'text-orange-400'}`}>{qualityPercentage}%</p>
                            <p className="text-xs text-slate-500 mt-1">Acceptance Rate</p>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
                             <div className="flex justify-between items-start mb-2">
                                <p className="text-slate-400 text-xs font-bold uppercase">Pending Review</p>
                                <ListTodo className="w-4 h-4 text-yellow-500" />
                            </div>
                            <p className="text-4xl font-mono text-yellow-400">{pendingCount}</p>
                            <p className="text-xs text-slate-500 mt-1">Needs Attention</p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <ListTodo className="w-5 h-5 text-indigo-400" />
                            Active Collection Directives
                        </h3>
                        <div className="space-y-4">
                            {goals.map(goal => {
                                const progress = Math.min(100, Math.round((goal.currentCount / goal.targetCount) * 100));
                                return (
                                    <div key={goal.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800/50">
                                        <div className="flex justify-between items-center mb-2">
                                            <div>
                                                <p className="font-semibold text-slate-200">{goal.title}</p>
                                                <p className="text-xs text-slate-500">{goal.description} • Due: {new Date(goal.deadline).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded font-mono ${goal.status === 'at-risk' ? 'bg-red-900/30 text-red-400' : 'bg-indigo-900/30 text-indigo-400'}`}>
                                                {goal.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} />
                                            </div>
                                            <p className="text-xs font-mono text-white w-16 text-right">{goal.currentCount}/{goal.targetCount}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-80">
                         <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                            <h4 className="text-sm font-semibold text-slate-400 mb-4">Defect Class Distribution</h4>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={chartData}>
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} cursor={{fill: '#334155', opacity: 0.4}} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#06b6d4' : '#3b82f6'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                         </div>
                         <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
                             <h4 className="text-sm font-semibold text-slate-400 mb-4">Dataset Health Factor</h4>
                             <div className="flex-1 flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={[{ name: 'Good', value: qualityPercentage }, { name: 'Poor', value: 100 - qualityPercentage }]} 
                                            innerRadius={60} 
                                            outerRadius={80} 
                                            paddingAngle={5} 
                                            dataKey="value"
                                        >
                                            <Cell fill="#22c55e" />
                                            <Cell fill="#ef4444" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                    <span className="text-3xl font-bold text-white">{qualityPercentage}%</span>
                                    <span className="text-xs text-slate-500">HEALTHY</span>
                                </div>
                             </div>
                         </div>
                    </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-6">
                     
                     {/* Video Brief Card */}
                     <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shrink-0">
                         <div className="p-4 bg-purple-900/20 border-b border-purple-500/20 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="bg-purple-500/20 p-2 rounded">
                                    <Film className="w-5 h-5 text-purple-400" />
                                </div>
                                <h3 className="font-bold text-white">Site Inspection Replay</h3>
                             </div>
                             {dashboardVideoUrl && <span className="text-[10px] bg-green-900 text-green-400 px-2 py-1 rounded">READY</span>}
                         </div>
                         
                         <div className="p-1 min-h-[180px] bg-black relative flex items-center justify-center">
                             {dashboardVideoUrl ? (
                                 <video src={dashboardVideoUrl} controls className="w-full h-full object-cover max-h-[220px]" />
                             ) : (
                                 <div className="text-center p-6 space-y-3">
                                     {isDashboardVideoGenerating ? (
                                         <div className="flex flex-col items-center">
                                            <RotateCw className="w-8 h-8 text-purple-400 animate-spin mb-2" />
                                            <p className="text-xs text-purple-300">Synthesizing Veo Video...</p>
                                         </div>
                                     ) : (
                                         <>
                                            <p className="text-xs text-slate-400">Generate a cinematic highlight reel of the most critical defects found today.</p>
                                            <button 
                                                onClick={handleGenerateDashboardVideo}
                                                disabled={items.length === 0}
                                                className="bg-purple-700 hover:bg-purple-600 text-white text-xs px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Play className="w-3 h-3 fill-current" />
                                                Generate Highlights
                                            </button>
                                         </>
                                     )}
                                 </div>
                             )}
                         </div>
                     </div>

                     <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden min-h-[300px]">
                        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center gap-3">
                            <div className="bg-indigo-500/20 p-2 rounded">
                                <Bot className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h3 className="font-bold text-white">Gemini 3 Planner</h3>
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto bg-slate-950/50">
                            {!report ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-4 opacity-50">
                                <FileText className="w-16 h-16" />
                                <p className="text-center text-sm px-6">Generate a strategic report to analyze dataset gaps and receive actionable insights.</p>
                            </div>
                            ) : (
                            <div className="prose prose-invert prose-sm">
                                <div dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b class="text-indigo-300">$1</b>') }} />
                            </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-800 bg-slate-900">
                            <button 
                                onClick={handleGenerateReport}
                                disabled={isGeneratingReport || items.length === 0}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-900/20"
                            >
                                {isGeneratingReport ? (
                                    <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Reasoning...
                                    </>
                                ) : (
                                    "Generate Strategic Report"
                                )}
                            </button>
                        </div>
                     </div>
                </div>
            </div>
        )}

        {activeTab === 'reconstruction' && (
           <div className="h-full flex flex-col items-center justify-center relative">
              
              {modelStatus === 'ready' ? (
                <div className="w-full h-full flex flex-col gap-4">
                    
                    {/* AI Video Toggle - Positioned over viewport */}
                    <div className="absolute top-6 right-6 z-20 flex items-center gap-3 bg-slate-900/90 backdrop-blur p-1.5 rounded-full border border-slate-700 shadow-xl">
                        <span className={`text-xs font-bold px-2 ${viewMode === 'video' ? 'text-purple-400' : 'text-slate-400'}`}>
                            AI VIDEO MODE
                        </span>
                        <button 
                            onClick={() => setViewMode(prev => prev === '3d' ? 'video' : '3d')}
                            className={`w-10 h-5 rounded-full transition-colors relative ${viewMode === 'video' ? 'bg-purple-600' : 'bg-slate-600'}`}
                        >
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${viewMode === 'video' ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="flex-1 flex gap-4 min-h-0">
                        {/* Sidebar: Part List */}
                        <div className="w-64 flex flex-col gap-3 shrink-0">
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detected Components</p>
                                <div className="space-y-2">
                                    {['Fuselage', 'Wing', 'Engine', 'Tail'].map(part => (
                                        <button 
                                            key={part}
                                            onClick={() => setSelectedPart(prev => prev === part ? null : part)}
                                            className={`w-full text-left p-3 rounded border transition-all ${
                                                selectedPart === part 
                                                ? 'bg-blue-900/30 border-blue-500 text-blue-400' 
                                                : 'bg-black/40 border-slate-800 text-slate-300 hover:border-slate-600'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm">{part}</span>
                                                <span className="text-[10px] bg-slate-800 px-1.5 rounded">{items.filter(i => i.metadata.component.includes(part)).length}</span>
                                            </div>
                                            <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{width: '85%'}} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Main Viewport */}
                        <div className="flex-1 bg-black rounded-xl border border-slate-800 relative overflow-hidden shadow-2xl flex items-center justify-center">
                            {viewMode === '3d' ? (
                                <>
                                    <CoverageVisualization items={items} onPartSelect={setSelectedPart} selectedPart={selectedPart} />
                                    <div className="absolute top-6 left-6 flex gap-2">
                                        <button 
                                            onClick={() => setModelStatus('idle')}
                                            className="bg-slate-900/80 backdrop-blur text-white p-2 rounded-lg border border-slate-700 hover:bg-slate-800"
                                            title="Reset Simulation"
                                        >
                                            <RotateCw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
                                    {generatedVideoUrl ? (
                                        <div className="w-full h-full relative">
                                            <video 
                                                src={generatedVideoUrl} 
                                                controls 
                                                autoPlay 
                                                loop 
                                                className="w-full h-full object-cover" 
                                            />
                                            <div className="absolute bottom-6 left-6 bg-purple-900/80 backdrop-blur px-3 py-1 rounded border border-purple-500/50 text-purple-200 text-xs font-bold">
                                                Veo AI Generated
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-6 max-w-md">
                                            {isVideoGenerating ? (
                                                 <>
                                                    <div className="relative w-24 h-24 mx-auto">
                                                        <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                                                            <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="6" />
                                                            <circle cx="50" cy="50" r="45" fill="none" stroke="#9333ea" strokeWidth="6" strokeDasharray="283" strokeDashoffset="75" />
                                                        </svg>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <Film className="w-8 h-8 text-purple-400 animate-pulse" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-white">Generating AI Video...</h3>
                                                        <p className="text-slate-400 text-sm mt-2">Veo 3.1 is synthesizing a cinematic flyover from your captured data. This may take a moment.</p>
                                                    </div>
                                                 </>
                                            ) : (
                                                <div className="text-slate-400">Initializing Video Engine...</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Info Panel (Contextual) */}
                        <div className="w-72 bg-slate-900 border border-slate-800 rounded-lg flex flex-col">
                            <div className="p-3 border-b border-slate-800">
                                <h3 className="font-bold text-white text-sm">Unified Analysis</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {selectedPart ? (
                                    <>
                                        <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded">
                                            <h4 className="text-blue-400 font-bold text-lg mb-1">{selectedPart}</h4>
                                            <p className="text-xs text-slate-300">Status: <span className="text-blue-400 font-bold">Scanning Complete</span></p>
                                        </div>
                                        
                                        {items.filter(i => i.metadata.component.includes(selectedPart)).length === 0 ? (
                                             <div className="text-center py-8 bg-black/20 rounded-lg border border-slate-800 border-dashed">
                                                <p className="text-slate-400 text-xs font-medium mb-3">No imagery collected for this part yet.</p>
                                                <button className="bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs px-3 py-2 rounded border border-slate-700 flex items-center gap-2 mx-auto transition">
                                                    <Camera className="w-3 h-3" />
                                                    Capture More Data
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-bold tracking-wider mt-2 mb-1">
                                                    <ImageIcon className="w-3 h-3" />
                                                    Source Imagery ({items.filter(i => i.metadata.component.includes(selectedPart)).length})
                                                </div>
                                                {items.filter(i => i.metadata.component.includes(selectedPart)).map(item => (
                                                    <div key={item.id} className="flex gap-2 bg-black/40 p-2 rounded border border-slate-800 hover:border-blue-500/50 transition">
                                                        <img src={item.imageUrl} className="w-10 h-10 object-cover rounded bg-slate-800" />
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-white truncate">{item.analysis?.defectType}</p>
                                                            <p className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-slate-500 px-4">
                                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Info className="w-6 h-6 text-slate-600" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-400">Select a Data Point</p>
                                        <p className="text-xs mt-1">Click any blue hotspot on the 3D model to inspect collected imagery.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
              ) : (
                  <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                      {modelStatus === 'idle' ? (
                        <>
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                                <div className="relative bg-slate-900 border-2 border-blue-500/50 rounded-full w-full h-full flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                                        <Box className="w-16 h-16 text-blue-400" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-2">Ready to Construct Digital Twin</h2>
                                <p className="text-slate-400 max-w-md mx-auto">
                                    {items.length > 0 
                                      ? `${items.length} images available for reconstruction.` 
                                      : "Upload field imagery to begin reconstruction."}
                                </p>
                            </div>
                            <button 
                                onClick={handleGenerateModel}
                                disabled={items.length === 0}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg shadow-blue-900/50 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                Generate with Gemini
                            </button>
                        </>
                      ) : (
                        <>
                             <div className="relative w-48 h-48 mx-auto">
                                <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="283" strokeDashoffset="75" className="opacity-75" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Bot className="w-12 h-12 text-blue-400 animate-pulse" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">Synthesizing Geometry...</h3>
                                <p className="text-slate-400 font-mono mt-2">Gemini 3 Spatial Analysis • 42% Complete</p>
                            </div>
                            <div className="flex gap-2 justify-center">
                                {[1,2,3].map(i => (
                                    <div key={i} className="w-20 h-16 bg-slate-800 rounded border border-slate-700 animate-pulse" style={{animationDelay: `${i*100}ms`}} />
                                ))}
                            </div>
                        </>
                      )}
                  </div>
              )}
           </div>
        )}

        {activeTab === 'gallery' && (
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 min-h-full">
                <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-slate-300">Raw Data Stream</h3>
                <button className="text-slate-400 hover:text-white flex items-center gap-2 text-sm bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
                    <Filter className="w-4 h-4" /> Filter View
                </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.length === 0 && <p className="text-slate-500 col-span-full text-center py-20">No samples collected yet.</p>}
                {items.slice().reverse().map((item) => (
                    <div key={item.id} className="relative group rounded-xl overflow-hidden border border-slate-700 bg-black aspect-square cursor-pointer hover:border-cyan-500 transition-all">
                    <img src={item.annotatedImageUrl || item.imageUrl} alt={item.analysis?.defectType} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-300" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent p-3 pt-8 translate-y-2 group-hover:translate-y-0 transition-transform">
                        <p className="text-xs font-bold text-white truncate">{item.analysis?.defectType}</p>
                        <div className="flex justify-between items-center mt-1">
                            <span className={`text-[10px] uppercase font-bold ${item.analysis?.severity === 'Critical' ? 'text-red-400' : 'text-slate-400'}`}>
                                {item.analysis?.severity}
                            </span>
                            <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                    {item.analysis?.severity === 'Critical' && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-black shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    )}
                    </div>
                ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};