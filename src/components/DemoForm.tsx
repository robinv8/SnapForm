import React from 'react';
import { FormData, FormFieldDefinition } from '../types';

interface DemoFormProps {
  fields: FormFieldDefinition[];
  values: FormData;
  onChange: (name: string, value: string | boolean | number) => void;
  title: string;
}

const DemoForm: React.FC<DemoFormProps> = ({ fields, values, onChange, title }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
      <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div className="text-xs text-neutral-400 font-mono bg-white px-3 py-1 rounded-full border border-neutral-200">
            https://example-app.com/signup
        </div>
        <div className="w-4"></div> 
      </div>
      
      <div className="p-8">
        <h2 className="text-2xl font-bold text-neutral-800 mb-6">{title}</h2>
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          {fields.map((field) => (
            <div key={field.id} className={field.type === 'checkbox' ? 'flex items-center' : ''}>
              {field.type !== 'checkbox' && (
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {field.label} {field.required && <span className="text-error">*</span>}
                </label>
              )}
              
              {field.type === 'select' ? (
                <select
                  name={field.name}
                  value={values[field.name]?.toString() || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  className="w-full rounded-lg border-neutral-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                >
                  <option value="">Select an option</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                 <textarea
                  name={field.name}
                  value={values[field.name]?.toString() || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border-neutral-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                />
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        name={field.name}
                        checked={!!values[field.name]}
                        onChange={(e) => onChange(field.name, e.target.checked)}
                        className="rounded border-neutral-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-sm font-medium text-neutral-700">{field.label}</span>
                </label>
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  value={values[field.name]?.toString() || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  className="w-full rounded-lg border-neutral-300 border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              )}
            </div>
          ))}
          
          <div className="pt-4">
            <button className="w-full bg-neutral-800 text-white font-medium py-2.5 rounded-lg hover:bg-neutral-900 transition-colors">
              Submit Registration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DemoForm;