import { GoogleGenAI, GenerateContentResponse, Content, Part as GenaiPart } from "@google/genai";
import { type Message, type Part, Role } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateText(promptParts: Part[], history: Message[]): Promise<string> {
    try {
        const historyContent: Content[] = history.map(msg => ({
            role: msg.role,
            parts: msg.parts.map(part => {
                if (part.inlineData) {
                    return { inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data } };
                }
                return { text: part.text ?? '' };
            })
        }));

        const currentPromptGenaiParts: GenaiPart[] = promptParts.map(part => {
             if (part.inlineData) {
                return { inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data } };
            }
            return { text: part.text ?? '' };
        });

        const contents: Content[] = [
            ...historyContent,
            { role: Role.USER, parts: currentPromptGenaiParts }
        ];

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
        });
        
        return response.text;
    } catch (error) {
        console.error("Gemini text generation error:", error);
        throw new Error("Failed to generate text from Gemini API.");
    }
}
