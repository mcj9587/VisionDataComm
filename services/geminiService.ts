import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Uses Gemini 2.5 Flash for rapid, pre-capture AR guidance.
 * Returns short, imperative instructions.
 */
export const getPreCaptureGuidance = async (base64Image: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: `You are an industrial camera assistant. Analyze this viewfinder frame. 
                   Provide 1-3 very short, punchy HUD (Heads-Up Display) instructions to help the engineer get a better photo for dataset collection. 
                   Examples: "Move Closer", "Too Dark", "Center the subject", "Avoid Glare", "Hold Steady".
                   Return ONLY a JSON array of strings.` }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Guidance failed", error);
    return ["Guidance unavailable"];
  }
};

/**
 * Uses Gemini 2.5 Flash for rapid, real-time field guidance and analysis.
 */
export const analyzeFieldImage = async (base64Image: string, contextPrompt: string): Promise<AnalysisResult> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      defectType: { type: Type.STRING, description: "Type of defect detected (e.g., Rust, Crack, Misalignment) or 'None'" },
      severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
      confidence: { type: Type.NUMBER, description: "Confidence score 0-100" },
      instructions: { type: Type.STRING, description: "Immediate guidance for the engineer (e.g., 'Move closer', 'Capture side view')" },
      isQualitySufficient: { type: Type.BOOLEAN, description: "Is the image clear enough for dataset inclusion?" },
      missingAngles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of other angles needed for a complete dataset" },
    },
    required: ["defectType", "severity", "confidence", "instructions", "isQualitySufficient"],
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: `Analyze this industrial machinery image. Context: ${contextPrompt}. Provide structured feedback for the field engineer.` }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as AnalysisResult;
  } catch (error) {
    console.error("Analysis failed", error);
    // Fallback for demo stability
    return {
      defectType: "Unknown",
      severity: "Low",
      confidence: 0,
      instructions: "Analysis service unavailable. Please retry.",
      isQualitySufficient: false,
    };
  }
};

/**
 * Uses Nano Banana Pro (Gemini 3 Pro Image Preview) to generate an annotated/highlighted version of the image.
 */
export const generateAugmentedOverlay = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: `Edit this image to visually highlight the following: ${prompt}. Draw clear neon bounding boxes or heatmaps over the defects. Keep the rest of the image photorealistic.` }
        ]
      },
      config: {
        imageConfig: {
           aspectRatio: "1:1",
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;

  } catch (error) {
    console.error("Augmentation failed", error);
    return null;
  }
};

/**
 * Uses Veo (veo-3.1-fast-generate-preview) to generate a flyover video of the component.
 */
export const generateInspectionVideo = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    // Critical: Create new instance to pick up the API key if it was just selected
    const aiWithKey = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let operation = await aiWithKey.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: base64Image,
        mimeType: 'image/jpeg',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Polling loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5s interval
      operation = await aiWithKey.operations.getVideosOperation({operation: operation});
    }

    if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        return `${operation.response.generatedVideos[0].video.uri}&key=${process.env.API_KEY}`;
    }
    
    return null;

  } catch (error) {
    console.error("Video generation failed", error);
    throw error;
  }
};

/**
 * Uses Gemini 3 Pro Preview for complex reasoning across the dataset (Data Scientist View).
 */
export const generateDatasetReport = async (items: any[]): Promise<string> => {
  try {
    const itemSummaries = items.map(i => 
      `ID: ${i.id}, Defect: ${i.analysis?.defectType}, Severity: ${i.analysis?.severity}, Quality: ${i.analysis?.isQualitySufficient}`
    ).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        Act as a Lead Data Scientist. Analyze the following captured dataset entries for an industrial predictive maintenance model.
        
        Dataset Entries:
        ${itemSummaries}

        Provide a concise strategic report covering:
        1. Class balance issues.
        2. Recommendations for the field team on what to capture next.
        3. Overall dataset health.
      `,
      config: {
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    return response.text || "No report generated.";
  } catch (error) {
    console.error("Report generation failed", error);
    return "Could not generate report at this time.";
  }
};

/**
 * Collaborative Agent Chat
 */
export const sendChatMessage = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    try {
        const chatHistory = history.map(h => ({
            role: h.sender === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
        }));

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: chatHistory,
            config: {
                systemInstruction: "You are 'Central', an advanced AI coordinator for an industrial factory. You bridge the gap between Field Engineers (on the floor) and Data Scientists (in the lab). Be concise, helpful, and professional. Focus on data quality, safety, and equipment context."
            }
        });

        const result = await chat.sendMessage({ message: newMessage });
        return result.text;
    } catch (error) {
        console.error("Chat error", error);
        return "Connection to Central interrupted.";
    }
}