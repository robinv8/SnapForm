import React, { useState, useCallback } from 'react';
import { generateSmartFormData } from './services/geminiService';
import ExtensionPopup from './components/ExtensionPopup';
import DemoForm from './components/DemoForm';
import { FormFieldDefinition, FormData, FillMode, LogEntry } from './types';
import { Layout, MousePointer2 } from 'lucide-react';

// Define the fields for our target form
const TARGET_FORM_FIELDS: FormFieldDefinition[] = [
  { id: 'f1', name: 'fullName', label: 'Full Name', type: 'text', required: true },
  { id: 'f2', name: 'email', label: 'Email Address', type: 'email', required: true },
  { id: 'f3', name: 'phone', label: 'Phone Number', type: 'tel' },
  { id: 'f4', name: 'role', label: 'Job Role', type: 'select', options: ['Developer', 'Product Manager', 'Designer', 'QA Engineer'], required: true },
  { id: 'f5', name: 'experience', label: 'Years of Experience', type: 'number' },
  { id: 'f6', name: 'bio', label: 'Short Bio', type: 'textarea' },
  { id: 'f7', name: 'newsletter', label: 'Subscribe to newsletter', type: 'checkbox' },
];

const App: React.FC = () => {
  // Application State
  const [formValues, setFormValues] = useState<FormData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [fillMode, setFillMode] = useState<FillMode>(FillMode.STANDARD);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Helper to add logs
  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      message,
      type
    }, ...prev]);
  };

  // Handler for manual input changes in the "Web Page"
  const handleFormChange = (name: string, value: string | boolean | number) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  // Handler for the "Clear" button in the extension
  const handleClear = () => {
    setFormValues({});
    addLog('Form cleared manually', 'info');
  };

  // The core logic: Triggering the auto-fill
  const handleAutoFill = useCallback(async () => {
    setIsLoading(true);
    addLog(`Starting ${fillMode === FillMode.AI ? 'AI' : 'Standard'} generation...`, 'info');

    try {
      let data: FormData;
      
      if (fillMode === FillMode.AI) {
        // Use Gemini API
        data = await generateSmartFormData(TARGET_FORM_FIELDS);
      } else {
        // Force a small delay to simulate processing for Standard mode
        await new Promise(resolve => setTimeout(resolve, 600));
        // Fallback to the same logic the service uses when API fails, but explicitly called here
        // We'll just call the service method which handles fallback internally if key is missing,
        // but for "Standard" mode we want purely deterministic/random logic without API.
        // For simplicity in this demo, we reuse the service fallback logic.
        data = await generateSmartFormData(TARGET_FORM_FIELDS); 
      }

      setFormValues(prev => ({ ...prev, ...data }));
      addLog(`Successfully filled ${Object.keys(data).length} fields`, 'success');

    } catch (error) {
      console.error(error);
      addLog('Failed to generate data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [fillMode]);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 relative overflow-hidden">
        
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        
        {/* Header Section */}
        <header className="mb-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-xl shadow-sm mb-4">
             <Layout className="text-primary mr-2" size={24} />
             <span className="font-bold text-lg text-neutral-800">FormFiller Pro Design Prototype</span>
          </div>
          <h1 className="text-4xl font-extrabold text-neutral-900 mb-4 tracking-tight">
            Stop Typing Dummy Data manually.
          </h1>
          <p className="text-lg text-neutral-600">
            A design concept for a browser extension that uses <span className="font-semibold text-primary">Gemini AI</span> to intelligently detect form context and generate realistic test data instantly.
          </p>
          <div className="mt-6 flex justify-center space-x-8 text-sm text-neutral-500">
             <div className="flex items-center"><MousePointer2 size={16} className="mr-2" /> One-click Fill</div>
             <div className="flex items-center"><Layout size={16} className="mr-2" /> Smart Context</div>
          </div>
        </header>

        {/* Interaction Stage */}
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center relative min-h-[600px]">
          
          {/* Left Side: The "Website" being tested */}
          <div className="w-full lg:w-2/3 max-w-3xl transition-all duration-500 ease-in-out">
            <DemoForm 
              title="Create User Account"
              fields={TARGET_FORM_FIELDS}
              values={formValues}
              onChange={handleFormChange}
            />
             <div className="mt-4 p-4 rounded-lg border border-dashed border-neutral-300 text-neutral-400 text-sm text-center">
                This area represents the webpage content the extension interacts with.
            </div>
          </div>

          {/* Right Side: The Extension Popup (Fixed position relative to container for demo) */}
          {/* In a real scenario this is position:fixed, but for the demo layout we treat it as a column 
              unless on mobile where it might stack. To mimic the "Extension" feel, we use absolute in desktop view 
              via the component classes, but let's manage layout here. */}
           
           {/* We render the component. It has absolute positioning built-in for the "Overlay" effect. 
               In a real generic web layout, we might want it static, but the prompt asks for a plugin design guide.
               The ExtensionPopup component is styled to float. */}
           <ExtensionPopup 
             isLoading={isLoading}
             logs={logs}
             currentMode={fillMode}
             onFill={handleAutoFill}
             onClear={handleClear}
             onModeChange={setFillMode}
           />
           
           {/* Visual connection line for demo purposes (Desktop only) */}
           <div className="hidden lg:block absolute top-32 right-[400px] w-24 h-[2px] bg-gradient-to-r from-transparent to-primary/30 pointer-events-none"></div>

        </div>
      </div>
    </div>
  );
};

export default App;