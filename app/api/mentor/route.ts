import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { provider, blueprint, projectName, customApiKey, systemPrompt } = await req.json();

    if (provider === 'groq') {
      const apiKey = customApiKey || process.env.GROQ_API_KEY;

      if (!apiKey) {
        return NextResponse.json(
          { error: 'API Key do Groq não encontrada no servidor. Configure-a nas variáveis de ambiente ou no painel do app.' },
          { status: 400 }
        );
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Analise este projeto '${projectName}':\n\n${blueprint}` }
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          { error: errorData.error?.message || 'Erro ao consultar Groq' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json({ text: data.choices[0]?.message?.content });
    }

    // Se for Gemini, podemos manter no cliente como recomendado, 
    // ou unificar aqui. O guia diz que Gemini DEVE ser no cliente.
    return NextResponse.json({ error: 'Provedor não suportado no servidor' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro no Mentor API:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
