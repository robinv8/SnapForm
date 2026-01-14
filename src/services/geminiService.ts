import { GoogleGenAI, Type } from "@google/genai";
import { FormFieldDefinition, FormData } from "../types";

// Get API key from chrome storage
async function getApiKey(): Promise<string | undefined> {
  try {
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    return result.geminiApiKey;
  } catch (error) {
    console.warn("Failed to retrieve API key from storage:", error);
    return undefined;
  }
}

// AI-powered form analysis - analyzes HTML to detect form fields
export const analyzeFormWithAI = async (formHtml: string): Promise<FormFieldDefinition[]> => {
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    console.warn("No API Key found, cannot use AI analysis");
    return [];
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `分析以下 HTML 代码，识别所有可填写的表单输入字段（input, select, textarea）。

对于每个字段，返回:
- id: 字段的唯一标识符（使用 id 属性，或 name 属性，或生成一个如 "field_1"）
- name: 字段名称（用于提交）
- label: 字段的中文或英文标签/描述
- type: 字段类型（text, email, tel, number, select, checkbox, date, textarea, url）
- required: 是否必填
- options: 如果是 select，列出选项值

HTML:
${formHtml}

只返回 JSON 数组，不要其他解释。`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique identifier for the field" },
              name: { type: Type.STRING, description: "Field name for form submission" },
              label: { type: Type.STRING, description: "Human readable label" },
              type: { type: Type.STRING, description: "Field type: text, email, tel, number, select, checkbox, date, textarea, url" },
              required: { type: Type.BOOLEAN, description: "Whether field is required" },
              options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Options for select fields" }
            },
            required: ["id", "name", "label", "type"]
          }
        }
      }
    });

    if (response.text) {
      const fields = JSON.parse(response.text) as FormFieldDefinition[];
      console.log("AI analyzed fields:", fields);
      return fields;
    }
    
    return [];
  } catch (error) {
    console.error("AI Form Analysis Error:", error);
    return [];
  }
};

// AI-powered data generation based on analyzed fields
export const generateSmartFormData = async (fields: FormFieldDefinition[]): Promise<FormData> => {
  const apiKey = await getApiKey();

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

      properties[field.id] = {
        type: schemaType,
        description: `Value for field: "${field.label}" (type: ${field.type})`,
      };
      required.push(field.id);
    });

    const prompt = `为以下表单字段生成真实的测试数据:
${JSON.stringify(fields.map(f => ({ id: f.id, label: f.label, type: f.type, options: f.options })), null, 2)}

要求:
- Email 使用有效格式
- URL 使用 https:// 开头的有效格式
- 电话号码使用真实格式
- 文本内容专业、合理
- 如果是中文标签，生成中文数据
- 如果有 options，从中选择一个`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
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

// Fallback generator for when API key is missing or fails
const generateLocalData = (fields: FormFieldDefinition[]): FormData => {
  const data: FormData = {};
  
  fields.forEach(field => {
    const nameLower = (field.name || '').toLowerCase();
    const labelLower = (field.label || '').toLowerCase();
    const idLower = (field.id || '').toLowerCase();
    const combined = `${nameLower} ${labelLower} ${idLower}`;
    
    if (field.type === 'checkbox') {
      data[field.id] = true;
    } else if (field.type === 'select' && field.options && field.options.length > 0) {
      data[field.id] = field.options[Math.floor(Math.random() * field.options.length)];
    } else if (field.type === 'number') {
      if (combined.includes('age')) data[field.id] = Math.floor(Math.random() * 50) + 18;
      else if (combined.includes('zip') || combined.includes('postal')) data[field.id] = 90210;
      else data[field.id] = Math.floor(Math.random() * 100);
    } else if (combined.includes('email')) {
      data[field.id] = `test.user.${Math.floor(Math.random() * 1000)}@example.com`;
    } else if (combined.includes('phone') || combined.includes('tel') || combined.includes('mobile')) {
      data[field.id] = '+1-555-010-9988';
    } else if (combined.includes('url') || combined.includes('website') || combined.includes('link')) {
      data[field.id] = `https://example.com/page-${Math.floor(Math.random() * 1000)}`;
    } else if (combined.includes('name') || combined.includes('名称') || combined.includes('姓名')) {
      data[field.id] = '测试连接器';
    } else if (combined.includes('address') || combined.includes('地址')) {
      data[field.id] = '123 Innovation Drive, Tech City';
    } else if (combined.includes('city') || combined.includes('城市')) {
      data[field.id] = 'San Francisco';
    } else if (combined.includes('bio') || combined.includes('description') || combined.includes('描述')) {
      data[field.id] = '这是一段测试描述文本。';
    } else {
      data[field.id] = `测试数据 ${Math.floor(Math.random() * 1000)}`;
    }
  });

  return data;
};