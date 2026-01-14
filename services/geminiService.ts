import { GoogleGenAI, Type } from "@google/genai";
import { FormFieldDefinition, FormData } from "../types";

// Fallback generator for when API key is missing or fails
const generateLocalData = (fields: FormFieldDefinition[]): FormData => {
  const data: FormData = {};
  
  fields.forEach(field => {
    const nameLower = field.name.toLowerCase();
    const labelLower = field.label.toLowerCase();
    
    if (field.type === 'checkbox') {
      data[field.name] = true;
    } else if (field.type === 'select' && field.options && field.options.length > 0) {
      data[field.name] = field.options[Math.floor(Math.random() * field.options.length)];
    } else if (field.type === 'number') {
      if (nameLower.includes('age')) data[field.name] = Math.floor(Math.random() * 50) + 18;
      else if (nameLower.includes('zip') || nameLower.includes('postal')) data[field.name] = 90210;
      else data[field.name] = Math.floor(Math.random() * 100);
    } else if (nameLower.includes('email') || labelLower.includes('email')) {
      data[field.name] = `test.user.${Math.floor(Math.random() * 1000)}@example.com`;
    } else if (nameLower.includes('phone') || nameLower.includes('tel')) {
      data[field.name] = '+1-555-010-9988';
    } else if (nameLower.includes('name')) {
      data[field.name] = 'Alex Rivera';
    } else if (nameLower.includes('address')) {
      data[field.name] = '123 Innovation Drive, Tech City';
    } else if (nameLower.includes('city')) {
      data[field.name] = 'San Francisco';
    } else if (nameLower.includes('bio') || nameLower.includes('description')) {
      data[field.name] = 'Software engineer passionate about automation and testing tools.';
    } else {
      data[field.name] = `Test Data ${Math.floor(Math.random() * 1000)}`;
    }
  });

  return data;
};

export const generateSmartFormData = async (fields: FormFieldDefinition[]): Promise<FormData> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.warn("No API Key found, falling back to local heuristic generation.");
    return generateLocalData(fields);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Construct a schema based on the fields provided
    const properties: Record<string, any> = {};
    const required: string[] = [];

    fields.forEach(field => {
      let schemaType = Type.STRING;
      if (field.type === 'checkbox') schemaType = Type.BOOLEAN;
      if (field.type === 'number') schemaType = Type.NUMBER;

      properties[field.name] = {
        type: schemaType,
        description: `Value for field label: "${field.label}"`,
      };
      required.push(field.name);
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate realistic test data for a form with the following fields: ${JSON.stringify(fields.map(f => ({ name: f.name, label: f.label, type: f.type, options: f.options })))}. Ensure emails are valid format, phone numbers are realistic, and text is professional.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: properties,
          required: required,
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return generateLocalData(fields);
  }
};