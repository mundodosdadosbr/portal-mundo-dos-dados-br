
import { GoogleGenAI } from "@google/genai";

// Initialize the API client
// Note: In a production client-side app, you might proxy this or use Firebase Vertex AI.
// For this standalone demo, we use the process.env.API_KEY if available.
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

/**
 * Generates a social media caption using Gemini 2.5 Flash
 */
export const generateSocialCaption = async (
  videoTitle: string,
  platform: string
): Promise<string> => {
  if (!apiKey) {
    return "API Key não configurada. Por favor, adicione sua chave da API Gemini.";
  }

  try {
    const prompt = `
      Atue como um especialista em social media.
      Crie uma legenda curta, engajadora e profissional para um post no ${platform}
      baseado no seguinte título de vídeo/conteúdo: "${videoTitle}".
      
      Regras:
      - Use emojis relevantes.
      - Inclua 3 hashtags em alta.
      - Tom de voz: Entusiasta e Educativo.
      - Sem aspas no início ou fim.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a legenda.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao conectar com a IA. Tente novamente mais tarde.";
  }
};

/**
 * Suggests video tags using Gemini
 */
export const suggestVideoTags = async (description: string): Promise<string[]> => {
  if (!apiKey) {
    return ["Dados", "Tecnologia", "Inovação", "CreatorNexus", "Demo"];
  }

  try {
    const prompt = `
      Gere 5 tags SEO (palavras-chave curtas) para um vídeo sobre: "${description}".
      Retorne APENAS as palavras separadas por vírgula, sem numeração ou bullets.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || "";
    return text.split(',').map(t => t.trim()).filter(t => t.length > 0);
  } catch (error) {
    return ["Dados", "Tech", "Brasil"];
  }
};
