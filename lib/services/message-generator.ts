import { OpenAI } from "openai";

export interface MessageGeneratorInput {
  businessName: string;
  category?: string;
  city: string;
  opportunityScore: number;
  reasons: string[];
  hasWebsite: boolean;
  websiteUrl?: string;
  hasInstagram: boolean;
  hasFacebook: boolean;
  reviewCount: number;
  rating?: number;
}

const API_KEY = process.env.OPENAI_API_KEY;
const IS_MOCK_MODE = !API_KEY || API_KEY.includes("MockKey") || API_KEY === "";

// Initialize OpenAI client. Fallback to mock string to prevent startup crashes.
const openai = new OpenAI({
  apiKey: API_KEY || "mock-api-key",
});

export class MessageGenerator {
  /**
   * Generates a personalized cold outreach message for WhatsApp using GPT-4
   */
  static async generate(input: MessageGeneratorInput): Promise<string> {
    const category = input.category || "Negócio Local";

    if (IS_MOCK_MODE) {
      console.log(`[MessageGenerator] Running in MOCK mode for business: ${input.businessName}`);
      return this.generateMockMessage(input, category);
    }

    try {
      const prompt = this.buildPrompt(input, category);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Você é um copywriter de alta performance especializado em vendas e prospecção de negócios locais (B2B). 
Você está vendendo serviços de criação de sites, SEO e presença digital para empreendedores.
Sua mensagem deve ser enviada via WhatsApp de forma direta, amigável e profissional.
Regras Críticas:
1. SEM jargão técnico (não fale 'SEO', 'Scraper', 'API', 'conversion rate'). Fale em "clientes", "posicionamento no Google", "vendas" e "profissionalismo".
2. Curta e escaneável (máximo 4 parágrafos curtos, espaçados, com emojis moderados).
3. Personalizada pelo nome do negócio, categoria e pelo problema exato encontrado.
4. Linguagem: Português do Brasil (PT-BR).
5. Estrutura: Saudação -> Observação honesta sobre o gap digital -> Proposta de valor tangível -> Call to Action direto (pergunta de 5 minutos).`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 350,
      });

      return response.choices[0]?.message?.content?.trim() || this.generateMockMessage(input, category);
    } catch (err) {
      console.error(`[MessageGenerator] OpenAI generation failed for ${input.businessName}`, err);
      // Failover to local templates on API block or credentials error
      return this.generateMockMessage(input, category);
    }
  }

  /**
   * Formulates the descriptive query payload for OpenAI
   */
  private static buildPrompt(input: MessageGeneratorInput, category: string): string {
    const gapsDescription = input.reasons.map((r) => `- ${r}`).join("\n");
    
    return `Gere uma abordagem de prospecção personalizada para o seguinte negócio:
- Nome da Empresa: ${input.businessName}
- Categoria: ${category}
- Cidade: ${input.city}
- Pontuação de Oportunidade: ${input.opportunityScore}/100
- Problemas Identificados no Perfil do Google:
${gapsDescription}

Informações de Apoio:
- Site Oficial Cadastrado: ${input.hasWebsite ? `Sim, mas redireciona para redes (${input.websiteUrl})` : "Não possui"}
- Possui Instagram: ${input.hasInstagram ? "Sim" : "Não"}
- Quantidade de Avaliações no Google: ${input.reviewCount} avaliações
- Média das Avaliações: ${input.rating !== undefined ? `${input.rating}/5.0` : "Sem avaliações"}

Escreva a mensagem pronta para colar no WhatsApp.`;
  }

  /**
   * Local backup template copywriting formatting
   */
  private static generateMockMessage(input: MessageGeneratorInput, category: string): string {

    // Case 1: Has no website at all (high priority)
    if (!input.hasWebsite || !input.websiteUrl) {
      if (input.hasInstagram) {
        return `Olá, pessoal da *${input.businessName}*! Tudo bem? 😊

Estava pesquisando por empresas de *${category}* aqui em *${input.city}* e encontrei o perfil de vocês no Google. O trabalho que vocês fazem no Instagram é excelente! 

Notei que vocês ainda não possuem um site oficial cadastrado no Google Maps para centralizar as informações. Hoje, ter um site integrado ao Instagram ajuda a reter clientes que buscam no Google e preferem fechar direto pelo WhatsApp de forma profissional.

Eu crio sites sob medida para negócios da sua região. Vocês teriam 5 minutinhos nesta semana para conversarmos sobre como criar um site profissional para a *${input.businessName}* e atrair mais clientes?`;
      }

      return `Olá! Falo com o responsável pela *${input.businessName}*? 

Localizei o contato de vocês pesquisando por *${category}* no Google aqui em *${input.city}*. Notei que vocês têm avaliações muito bacanas, mas ainda não possuem um site profissional na internet.

Hoje, mais de 80% das pessoas pesquisam no Google antes de comprar de empresas locais. Sem um site, muitos clientes acabam fechando com concorrentes que já têm página própria.

Eu trabalho desenvolvendo sites rápidos e otimizados para atrair clientes. Podemos conversar por 5 minutos amanhã para ver como colocar a *${input.businessName}* no topo das buscas?`;
    }

    // Case 2: Website lists social media directly
    const urlLower = input.websiteUrl.toLowerCase();
    const isSocialOnly = urlLower.includes("instagram.com") || urlLower.includes("facebook.com");
    if (isSocialOnly) {
      return `Olá! Tudo bem com a equipe da *${input.businessName}*?

Encontrei vocês pesquisando no Google por *${category}* em *${input.city}*. Percebi que o site cadastrado no perfil de vocês aponta diretamente para suas redes sociais.

As redes são ótimas para engajar, mas ter um site próprio de página única (Landing Page) passa muito mais credibilidade e ajuda a destacar seus diferenciais, além de acelerar o contato direto no WhatsApp para fechar vendas.

Eu crio Landing Pages focadas em conversão. Vocês teriam 5 minutos nesta semana para batermos um papo rápido sobre como estruturar a presença digital de vocês?`;
    }

    // Case 3: Good website but reputation gaps (low reviews or ratings)
    if (input.reviewCount < 10) {
      return `Olá! Falo com o gerente ou proprietário da *${input.businessName}*? 😊

Vi o perfil de vocês no Google Maps e gostei muito da proposta de vocês como *${category}* aqui em *${input.city}*.

Notei que vocês têm ótimos serviços, mas o perfil do Google ainda conta com poucas avaliações registradas (apenas ${input.reviewCount}). No Google Maps, empresas com mais avaliações aparecem primeiro e ganham a confiança de novos clientes muito mais rápido.

Eu ajudo empresas locais a automatizarem a coleta de avaliações 5 estrelas dos clientes reais via WhatsApp. Gostaria de entender em 5 minutos como podemos subir a reputação da *${input.businessName}* no Google?`;
    }

    // Catch-all fallback
    return `Olá! Tudo bem com a equipe da *${input.businessName}*?

Pesquisei por *${category}* em *${input.city}* e gostei muito do perfil do Maps de vocês. 

Identifiquei que existem alguns pontos simples de melhoria na presença digital de vocês que, se ajustados, podem ajudar a atrair mais clientes que buscam no Google todos os dias.

Eu atuo ajudando negócios em *${input.city}* a melhorarem seus canais digitais e aumentarem suas vendas. Vocês teriam 5 minutos livres nesta semana para eu te passar essas dicas práticas?`;
  }
}
