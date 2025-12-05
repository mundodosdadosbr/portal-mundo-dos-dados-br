import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) {
    console.warn("API_KEY is missing in process.env");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates a social media caption based on a video title and platform style.
 */
export const generateSocialCaption = async (
  videoTitle: string,
  platform: string
): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const prompt = `
      Atue como um gerente de mídias sociais profissional.
      Escreva uma legenda cativante e engajadora em Português do Brasil para um post no ${platform} baseado neste título de vídeo: "${videoTitle}".
      Inclua 3-5 hashtags relevantes.
      Mantenha abaixo de 280 caracteres se for para Twitter/Facebook, ou um pouco mais longo para Instagram/TikTok.
      Use emojis.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a legenda.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao gerar conteúdo. Verifique sua configuração de API.";
  }
};

/**
 * Suggests video tags or keywords based on a description.
 */
export const suggestVideoTags = async (description: string): Promise<string[]> => {
  const ai = getAiClient();
  
  try {
    const prompt = `
      Analise esta descrição de vídeo e forneça uma lista de 10 tags/palavras-chave de alto tráfego para SEO em Português.
      Descrição: "${description}"
      Retorne APENAS a lista separada por vírgulas, sem nenhum outro texto.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || "";
    return text.split(',').map(tag => tag.trim());
  } catch (error) {
    console.error("Gemini API Error:", error);
    return ["Erro", "Verificar", "API"];
  }
};