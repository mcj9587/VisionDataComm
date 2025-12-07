import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Upload, CheckCircle, AlertTriangle, ScanEye, Zap, MessageSquare, ChevronRight, Crosshair } from 'lucide-react';
import { analyzeFieldImage, generateAugmentedOverlay, getPreCaptureGuidance } from '../services/geminiService';
import { CapturedItem, AnalysisResult } from '../types';

interface FieldViewProps {
  onCapture: (item: CapturedItem) => void;
  onOpenChat: () => void;
}

export const FieldView: React.FC<FieldViewProps> = ({ onCapture, onOpenChat }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAugmenting, setIsAugmenting] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [machineContext, setMachineContext] = useState("Fuselage - Section 4A"); // Default to an aircraft part
  
  // AR Guidance State
  const [isGuidanceActive, setIsGuidanceActive] = useState(false);
  const [guidanceMessages, setGuidanceMessages] = useState<string[]>([]);
  const guidanceIntervalRef = useRef<number | null>(null);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("Camera access denied", err);
      }
    };
    if (!capturedImage) startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
      if (guidanceIntervalRef.current) window.clearInterval(guidanceIntervalRef.current);
    };
  }, [capturedImage]);

  // Handle AR Guidance Loop
  useEffect(() => {
      if (isGuidanceActive && !capturedImage) {
          const scanFrame = async () => {
              if (videoRef.current) {
                  const canvas = document.createElement('canvas');
                  // Use lower res for speed
                  canvas.width = 320; 
                  canvas.height = 240;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                  const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                  
                  const msgs = await getPreCaptureGuidance(base64);
                  setGuidanceMessages(msgs);
              }
          };

          // Initial scan
          scanFrame();
          // Scan every 3 seconds
          guidanceIntervalRef.current = window.setInterval(scanFrame, 3000);
      } else {
          setGuidanceMessages([]);
          if (guidanceIntervalRef.current) window.clearInterval(guidanceIntervalRef.current);
      }

      return () => {
          if (guidanceIntervalRef.current) window.clearInterval(guidanceIntervalRef.current);
      };
  }, [isGuidanceActive, capturedImage]);

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      setIsGuidanceActive(false); // Turn off guidance
      // Stop stream to save battery/resources
      stream?.getTracks().forEach(track => track.stop());
    }
  };

  const handleAnalyze = async () => {
    if (!capturedImage) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    setAnnotatedImage(null);

    const base64 = capturedImage.split(',')[1];
    const result = await analyzeFieldImage(base64, machineContext);
    
    setAnalysis(result);
    setIsAnalyzing(false);

    // Auto-trigger augmentation if defect found
    if (result.defectType !== 'None' && result.isQualitySufficient) {
      handleAugment(base64, result.defectType);
    }
  };

  const handleAugment = async (base64: string, defect: string) => {
    setIsAugmenting(true);
    const overlay = await generateAugmentedOverlay(base64, `defect: ${defect}`);
    setAnnotatedImage(overlay);
    setIsAugmenting(false);
  };

  const handleSave = () => {
    if (capturedImage && analysis) {
      // Determine component based on context selection for the demo
      let component = 'Fuselage';
      if (machineContext.includes('Wing')) component = 'Wing';
      if (machineContext.includes('Engine')) component = 'Engine';
      if (machineContext.includes('Tail')) component = 'Tail';

      const newItem: CapturedItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        imageUrl: capturedImage,
        annotatedImageUrl: annotatedImage || undefined,
        analysis,
        status: analysis.isQualitySufficient ? 'approved' : 'pending',
        metadata: {
          machineId: 'B787-X',
          component: component,
          location: 'Hangar 1'
        }
      };
      onCapture(newItem);
      handleReset();
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setAnalysis(null);
    setAnnotatedImage(null);
    setIsGuidanceActive(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center z-10">
        <div>
          <h2 className="text-lg font-semibold text-orange-400 tracking-tight">FIELD OPS // CAPTURE</h2>
          <p className="text-xs text-slate-400 font-mono">{machineContext}</p>
        </div>
        <div className="flex items-center space-x-3">
            <button 
                onClick={onOpenChat}
                className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-cyan-400 relative"
            >
                <MessageSquare className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </button>
           <select 
            value={machineContext}
            onChange={(e) => setMachineContext(e.target.value)}
            className="bg-slate-700 text-xs rounded px-2 py-1 border border-slate-600 outline-none max-w-[150px]"
           >
             <option>Fuselage - Section 4A</option>
             <option>Left Wing - Flap Track</option>
             <option>Right Engine - Intake</option>
             <option>Tail - Vertical Stabilizer</option>
           </select>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        {!capturedImage ? (
          <>
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover transition-opacity ${isGuidanceActive ? 'opacity-80' : 'opacity-100'}`} 
            />
            {/* HUD Overlay for Camera */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-orange-500/50" />
                <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-orange-500/50" />
                <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-orange-500/50" />
                <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-orange-500/50" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Crosshair className="w-8 h-8 text-white/30" />
                </div>
            </div>

            {/* AR Guidance Messages */}
            {isGuidanceActive && (
                <div className="absolute top-1/4 left-0 right-0 flex flex-col items-center space-y-2 pointer-events-none z-20">
                    <div className="bg-black/60 backdrop-blur px-4 py-1 rounded-full border border-cyan-500/50">
                        <p className="text-cyan-400 text-xs font-mono animate-pulse">AI SCANNING ACTIVE...</p>
                    </div>
                    {guidanceMessages.map((msg, idx) => (
                        <div key={idx} className="bg-red-500/80 backdrop-blur px-6 py-2 rounded-lg border border-red-400 shadow-lg animate-bounce">
                            <p className="text-white font-bold tracking-wide uppercase">{msg}</p>
                        </div>
                    ))}
                    {guidanceMessages.length === 0 && (
                         <div className="bg-green-500/80 backdrop-blur px-6 py-2 rounded-lg border border-green-400 shadow-lg">
                            <p className="text-white font-bold tracking-wide uppercase">SCENE CLEAR</p>
                        </div>
                    )}
                </div>
            )}
            
            {/* Camera Controls */}
            <div className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-6">
                <button 
                    onClick={() => setIsGuidanceActive(!isGuidanceActive)}
                    className={`px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-2 backdrop-blur transition-all ${
                        isGuidanceActive 
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                        : 'bg-slate-900/40 border-slate-500 text-slate-300'
                    }`}
                >
                    <ScanEye className="w-4 h-4" />
                    {isGuidanceActive ? 'AR GUIDANCE ON' : 'ENABLE GUIDANCE'}
                </button>

                <button 
                    onClick={handleCapture}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent hover:bg-white/20 transition-all group"
                >
                    <div className="w-16 h-16 bg-red-600 rounded-full group-hover:scale-90 transition-transform shadow-[0_0_15px_rgba(220,38,38,0.7)]" />
                </button>
            </div>
          </>
        ) : (
          <div className="relative w-full h-full">
            <img 
              src={annotatedImage || capturedImage} 
              alt="Capture" 
              className="w-full h-full object-contain bg-slate-900" 
            />
            {isAugmenting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                 <div className="text-center">
                    <ScanEye className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-cyan-400 font-mono text-sm tracking-widest">GEMINI PROCESSSING<br/>GENERATING 2K OVERLAY</p>
                 </div>
              </div>
            )}
            
            {annotatedImage && !isAugmenting && (
                <button 
                  onClick={() => setAnnotatedImage(prev => prev === annotatedImage ? null : annotatedImage)}
                  className="absolute top-4 right-4 bg-slate-900/80 px-4 py-2 rounded-lg border border-cyan-500/50 text-cyan-400 text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-slate-800"
                >
                  <ScanEye className="w-4 h-4" />
                  TOGGLE AR LAYER
                </button>
            )}
          </div>
        )}
      </div>

      {/* Analysis Panel */}
      {capturedImage && (
        <div className="bg-slate-800 border-t border-slate-700 p-4 shrink-0 max-h-[45vh] overflow-y-auto shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-20">
          {!analysis && !isAnalyzing && (
            <div className="text-center py-4">
              <button 
                onClick={handleAnalyze}
                className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-lg font-bold tracking-wide flex items-center mx-auto gap-2 shadow-lg shadow-orange-900/40 transform hover:scale-105 transition"
              >
                <Zap className="w-5 h-5 fill-current" />
                ANALYZE CAPTURE
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <RefreshCw className="w-10 h-10 text-orange-400 animate-spin" />
              <div className="space-y-1 text-center">
                  <p className="text-white font-bold">ANALYZING DEFECTS</p>
                  <p className="text-slate-400 text-xs font-mono">GEMINI 2.5 FLASH RUNNING DIAGNOSTICS...</p>
              </div>
            </div>
          )}

          {analysis && (
            <div className="space-y-5 animate-in slide-in-from-bottom-5 fade-in duration-300">
              <div className="flex items-start justify-between">
                <div>
                   <h3 className="font-bold text-xl text-white flex items-center gap-3">
                     {analysis.defectType}
                     <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase tracking-wide ${
                       analysis.severity === 'Critical' ? 'border-red-500 text-red-500 bg-red-950/30' : 
                       analysis.severity === 'High' ? 'border-orange-500 text-orange-500 bg-orange-950/30' : 
                       'border-green-500 text-green-500 bg-green-950/30'
                     }`}>
                       {analysis.severity} SEVERITY
                     </span>
                   </h3>
                   <div className="flex items-center gap-4 mt-2">
                       <p className="text-xs text-slate-400 font-mono">CONFIDENCE: <span className="text-white">{analysis.confidence}%</span></p>
                       <p className="text-xs text-slate-400 font-mono">QUALITY: <span className={analysis.isQualitySufficient ? "text-green-400" : "text-red-400"}>{analysis.isQualitySufficient ? "PASS" : "FAIL"}</span></p>
                   </div>
                </div>
                {analysis.isQualitySufficient ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
                )}
              </div>

              <div className="bg-slate-700/30 p-4 rounded-lg border-l-4 border-cyan-500">
                <p className="text-cyan-400 text-xs font-bold font-mono mb-2 uppercase tracking-wider">Instructions</p>
                <p className="text-slate-100 text-sm leading-relaxed">{analysis.instructions}</p>
              </div>

              {analysis.missingAngles && analysis.missingAngles.length > 0 && (
                <div className="text-xs flex flex-wrap gap-2 items-center">
                  <span className="text-orange-300 font-bold uppercase">Required Next:</span> 
                  {analysis.missingAngles.map((angle, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-700 rounded text-slate-300 border border-slate-600">{angle}</span>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition font-medium text-sm"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-500 transition shadow-lg shadow-orange-900/20 text-sm flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload to Dataset
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};