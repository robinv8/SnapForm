import React from 'react';
import { Zap, Settings, RefreshCw, Sparkles, AlertCircle, CheckCircle2, Bot } from 'lucide-react';
import { FillMode, Profile, LogEntry } from '../types';

interface ExtensionPopupProps {
  isLoading: boolean;
  logs: LogEntry[];
  currentMode: FillMode;
  onFill: () => void;
  onClear: () => void;
  onModeChange: (mode: FillMode) => void;
}

const ExtensionPopup: React.FC<ExtensionPopupProps> = ({
  isLoading,
  logs,
  currentMode,
  onFill,
  onClear,
  onModeChange
}) => {
  return (
    <div className="w-[360px] bg-white rounded-xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden h-[600px] absolute right-8 top-24 z-50 animate-fade-in-up">
      {/* Header */}
      <div className="bg-primary px-5 py-4 flex justify-between items-center text-white">
        <div className="flex items-center space-x-2">
          <div className="bg-white/20 p-1.5 rounded-md">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-semibold tracking-wide">FormFiller Pro</span>
        </div>
        <button className="text-white/80 hover:text-white transition-colors">
          <Settings size={18} />
        </button>
      </div>

      {/* Main Content */}
      <div className="p-5 flex-1 flex flex-col bg-neutral-50">
        
        {/* Profile/Mode Selector */}
        <div className="mb-6">
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">
                Generation Mode
            </label>
            <div className="flex bg-white p-1 rounded-lg border border-neutral-200 shadow-sm">
                <button 
                    onClick={() => onModeChange(FillMode.STANDARD)}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-all ${currentMode === FillMode.STANDARD ? 'bg-neutral-100 text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                    <Zap size={14} />
                    <span>Standard</span>
                </button>
                <button 
                     onClick={() => onModeChange(FillMode.AI)}
                     className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md text-sm font-medium transition-all ${currentMode === FillMode.AI ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                    <Bot size={14} />
                    <span>AI Smart Fill</span>
                </button>
            </div>
            {currentMode === FillMode.AI && (
                <div className="mt-2 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded border border-indigo-100 flex items-center">
                    <Sparkles size={12} className="mr-1.5" />
                    Powered by Gemini 3 Flash
                </div>
            )}
        </div>

        {/* Primary Actions */}
        <div className="space-y-3 mb-6">
            <button
                onClick={onFill}
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white shadow-md transition-all flex items-center justify-center space-x-2
                    ${isLoading 
                        ? 'bg-neutral-400 cursor-not-allowed' 
                        : 'bg-primary hover:bg-blue-600 active:transform active:scale-95'
                    }`}
            >
                {isLoading ? (
                    <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Generating Data...</span>
                    </>
                ) : (
                    <>
                        <Zap size={18} />
                        <span>Auto Fill Form</span>
                    </>
                )}
            </button>
            
             <button
                onClick={onClear}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors text-sm"
            >
                Clear Form
            </button>
        </div>

        {/* Activity Log */}
        <div className="flex-1 overflow-hidden flex flex-col">
             <div className="flex justify-between items-end mb-2">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Activity Log
                </label>
             </div>
             <div className="bg-white border border-neutral-200 rounded-lg flex-1 overflow-y-auto p-3 space-y-2 text-sm shadow-inner">
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                        <span className="text-xs">No activity yet</span>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="flex items-start space-x-2 animate-fade-in">
                            <div className="mt-0.5 shrink-0">
                                {log.type === 'success' && <CheckCircle2 size={14} className="text-success" />}
                                {log.type === 'error' && <AlertCircle size={14} className="text-error" />}
                                {log.type === 'info' && <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-300" />}
                            </div>
                            <div>
                                <p className="text-neutral-700 leading-tight">{log.message}</p>
                                <span className="text-[10px] text-neutral-400">
                                    {log.timestamp.toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
             </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-neutral-100 p-3 text-center border-t border-neutral-200">
         <p className="text-[10px] text-neutral-400">v1.0.0 • Developer Preview</p>
      </div>
    </div>
  );
};

export default ExtensionPopup;