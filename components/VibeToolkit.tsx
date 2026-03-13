'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileCode, 
  Terminal, 
  Zap, 
  Copy, 
  Check, 
  ShieldAlert, 
  Sparkles,
  ChevronRight,
  FolderOpen,
  X,
  Download,
  Settings,
  Key
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { 
  FileData, 
  isRelevantFile, 
  readFileContent, 
  generateBlueprint,
  getExtension 
} from '@/lib/bundler';

const SYSTEM_PROMPT = `
Você é um "Mentor de Vibe-Coding Senior". 
Sua tarefa é analisar o código do projeto enviado e gerar um documento de contexto que ajude o usuário a continuar desenvolvendo.

Entregue o seguinte conteúdo em Markdown:
1. **Resumo Executivo:** O que o projeto faz de forma simples e "cool".
2. **Mapa de Vibe:** Quais tecnologias estão sendo usadas e por que elas são boas.
3. **Próximos Passos:** Sugira 3 funcionalidades ou melhorias que o usuário poderia fazer a seguir para evoluir o projeto.
4. **Alerta de Mentor:** Identifique algum "code smell" ou algo que possa ser melhorado na estrutura atual.
5. **Prompt Sugerido:** Um prompt pronto que o usuário pode colar no chat para pedir a primeira melhoria.

Use uma linguagem amigável, direta e cheia de energia positiva (use emojis). Não crie explicações longas ou código novo agora.
`;

export default function VibeToolkit() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [projectName, setProjectName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [blueprint, setBlueprint] = useState('');
  const [mentorContext, setMentorContext] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [customGroqApiKey, setCustomGroqApiKey] = useState('');
  const [provider, setProvider] = useState<'gemini' | 'groq'>('gemini');
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom API Keys and provider from localStorage on mount
  React.useEffect(() => {
    const savedKey = localStorage.getItem('vibetoolkit_api_key');
    const savedGroqKey = localStorage.getItem('vibetoolkit_groq_api_key');
    const savedProvider = localStorage.getItem('vibetoolkit_provider') as 'gemini' | 'groq';
    
    if (savedKey) setCustomApiKey(savedKey);
    if (savedGroqKey) setCustomGroqApiKey(savedGroqKey);
    if (savedProvider) setProvider(savedProvider);
  }, []);

  // Save custom API Key to localStorage
  const saveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('vibetoolkit_api_key', key);
  };

  const saveGroqApiKey = (key: string) => {
    setCustomGroqApiKey(key);
    localStorage.setItem('vibetoolkit_groq_api_key', key);
  };

  const saveProvider = (p: 'gemini' | 'groq') => {
    setProvider(p);
    localStorage.setItem('vibetoolkit_provider', p);
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsProcessing(true);
    const relevantFiles: FileData[] = [];
    let name = '';

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (isRelevantFile(file)) {
        const path = (file as any).webkitRelativePath || file.name;
        if (!name) name = path.split('/')[0] || 'Meu Projeto';
        
        const content = await readFileContent(file);
        relevantFiles.push({
          name: file.name,
          path: path,
          content: content,
          extension: getExtension(file.name)
        });
      }
    }

    setFiles(relevantFiles);
    setProjectName(name);
    setIsProcessing(false);
    
    const generated = generateBlueprint(relevantFiles, name);
    setBlueprint(generated);
  };

  const generateAIContext = async () => {
    if (!blueprint) return;
    
    setIsGeneratingAI(true);
    try {
      if (provider === 'gemini') {
        const apiKey = customApiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        
        if (!apiKey) {
          throw new Error('API Key do Gemini não encontrada. Configure-a no painel de configurações.');
        }

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Analise este projeto '${projectName}':\n\n${blueprint}`,
          config: {
            systemInstruction: SYSTEM_PROMPT,
          }
        });

        setMentorContext(response.text || 'Falha ao gerar contexto.');
      } else {
        // Groq Implementation
        const apiKey = customGroqApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY;

        if (!apiKey) {
          throw new Error('API Key do Groq não encontrada. Configure-a no painel de configurações.');
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
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `Analise este projeto '${projectName}':\n\n${blueprint}` }
            ],
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Erro ao consultar Groq');
        }

        const data = await response.json();
        setMentorContext(data.choices[0]?.message?.content || 'Falha ao gerar contexto.');
      }
    } catch (error: any) {
      console.error('Erro na IA:', error);
      setMentorContext(`Erro: ${error.message || 'Falha ao conectar com o Mentor IA.'}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const copyToClipboard = () => {
    const fullText = mentorContext 
      ? `> # CONTEXTO DO PROJETO\n${mentorContext}\n\n---\n\n# ESTRUTURA E CÓDIGO\n${blueprint}`
      : blueprint;
    
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setFiles([]);
    setBlueprint('');
    setMentorContext('');
    setProjectName('');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-black pb-6">
        <div>
          <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">
            Vibe<span className="text-emerald-500">Toolkit</span>
          </h1>
          <p className="mt-2 text-zinc-500 font-mono text-sm uppercase tracking-widest">
            Contextualizador de Projetos para IA v1.0
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 border-2 border-black transition-all ${showSettings ? 'bg-black text-white' : 'hover:bg-zinc-100'}`}
              title="Configurações de API"
            >
              <Settings className="w-6 h-6" />
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 z-50"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                      <Settings className="w-4 h-4 text-emerald-500" />
                      <h4 className="font-black text-xs uppercase tracking-widest">Configurações de IA</h4>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-400">Provedor</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => saveProvider('gemini')}
                          className={`p-2 text-[10px] font-bold uppercase border-2 transition-all ${
                            provider === 'gemini' ? 'border-black bg-black text-white' : 'border-zinc-200 hover:border-black'
                          }`}
                        >
                          Gemini
                        </button>
                        <button 
                          onClick={() => saveProvider('groq')}
                          className={`p-2 text-[10px] font-bold uppercase border-2 transition-all ${
                            provider === 'groq' ? 'border-black bg-black text-white' : 'border-zinc-200 hover:border-black'
                          }`}
                        >
                          Groq (Llama)
                        </button>
                      </div>
                    </div>

                    {provider === 'gemini' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Key className="w-3 h-3 text-emerald-500" />
                          <label className="text-[10px] font-bold uppercase text-zinc-400">Gemini API Key</label>
                        </div>
                        <input 
                          type="password"
                          value={customApiKey}
                          onChange={(e) => saveApiKey(e.target.value)}
                          placeholder="AIza..."
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 font-mono text-xs focus:outline-none focus:border-black transition-colors"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Key className="w-3 h-3 text-orange-500" />
                          <label className="text-[10px] font-bold uppercase text-zinc-400">Groq API Key</label>
                        </div>
                        <input 
                          type="password"
                          value={customGroqApiKey}
                          onChange={(e) => saveGroqApiKey(e.target.value)}
                          placeholder="gsk_..."
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 font-mono text-xs focus:outline-none focus:border-black transition-colors"
                        />
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                      <span className="text-[10px] font-bold uppercase text-zinc-400">Status:</span>
                      <span className={`text-[10px] font-bold uppercase ${
                        (provider === 'gemini' && customApiKey) || (provider === 'groq' && customGroqApiKey) 
                          ? 'text-emerald-500' 
                          : 'text-zinc-400'
                      }`}>
                        {(provider === 'gemini' && customApiKey) || (provider === 'groq' && customGroqApiKey) 
                          ? 'Customizada' 
                          : 'Padrão (Ambiente)'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <a 
            href="https://github.com/SandroBreaker/VibeToolkit/archive/refs/heads/main.zip"
            className="px-6 py-3 border-2 border-black font-bold hover:bg-zinc-100 transition-all flex items-center gap-2 text-sm uppercase tracking-tighter"
            title="Baixar para rodar local"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Baixar Local</span>
          </a>

          {!blueprint ? (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="group relative px-8 py-4 bg-black text-white font-bold text-lg hover:bg-emerald-600 transition-colors flex items-center gap-3 overflow-hidden"
            >
              <FolderOpen className="w-6 h-6" />
              SELECIONAR PASTA
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFolderSelect}
                className="hidden" 
                {...({ webkitdirectory: "", directory: "" } as any)}
              />
            </button>
          ) : (
            <button 
              onClick={reset}
              className="px-6 py-3 border-2 border-black font-bold hover:bg-black hover:text-white transition-all flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              LIMPAR
            </button>
          )}
        </div>
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center py-20">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <Zap className="w-12 h-12 text-emerald-500" />
          </motion.div>
          <span className="ml-4 font-bold text-xl animate-pulse">MAPEANDO VIBE...</span>
        </div>
      )}

      <AnimatePresence>
        {blueprint && !isProcessing && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Sidebar Stats */}
            <div className="lg:col-span-3 space-y-6">
              <div className="p-6 bg-zinc-100 border-2 border-black space-y-4">
                <h3 className="font-black text-xs uppercase tracking-tighter border-b border-black/10 pb-2">Status do Projeto</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-zinc-500">Arquivos:</span>
                    <span className="font-bold">{files.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-zinc-500">Tokens Est.:</span>
                    <span className="font-bold">{Math.round(blueprint.length / 4)}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={generateAIContext}
                disabled={isGeneratingAI || !!mentorContext}
                className={`w-full p-6 flex flex-col items-center gap-3 border-2 border-black transition-all ${
                  mentorContext 
                    ? 'bg-zinc-100 text-zinc-400 cursor-default' 
                    : 'bg-emerald-500 text-black hover:bg-emerald-400 font-bold'
                }`}
              >
                {isGeneratingAI ? (
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }}>
                    <Sparkles className="w-8 h-8" />
                  </motion.div>
                ) : (
                  <Sparkles className="w-8 h-8" />
                )}
                <span className="text-sm uppercase tracking-tighter">
                  {isGeneratingAI ? 'Consultando Mentor...' : mentorContext ? 'Mentor Consultado' : 'Chamar Mentor IA'}
                </span>
              </button>

              <button 
                onClick={copyToClipboard}
                className="w-full p-6 bg-black text-white flex flex-col items-center gap-3 border-2 border-black hover:bg-zinc-800 transition-all font-bold"
              >
                {copied ? <Check className="w-8 h-8 text-emerald-400" /> : <Copy className="w-8 h-8" />}
                <span className="text-sm uppercase tracking-tighter">
                  {copied ? 'Copiado!' : 'Copiar Contexto'}
                </span>
              </button>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-9 space-y-8">
              {/* Mentor Section */}
              {mentorContext && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 bg-emerald-50 border-2 border-emerald-500 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest">
                    AI Mentor Feedback
                  </div>
                  <div className="prose prose-emerald max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter">
                    <div className="whitespace-pre-wrap font-sans text-emerald-900 leading-relaxed">
                      {mentorContext}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Blueprint Preview */}
              <div className="border-2 border-black">
                <div className="bg-black text-white px-4 py-2 flex justify-between items-center">
                  <span className="font-mono text-xs uppercase tracking-widest">Blueprint Preview</span>
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="p-6 bg-white max-h-[600px] overflow-y-auto font-mono text-sm">
                  <pre className="whitespace-pre-wrap text-zinc-700">
                    {blueprint}
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!blueprint && !isProcessing && (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
          <div className="p-8 bg-zinc-100 rounded-full border-2 border-dashed border-zinc-300">
            <Upload className="w-16 h-16 text-zinc-300" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Pronto para o Vibe-Coding?</h2>
            <p className="text-zinc-500 max-w-md mx-auto">
              Selecione a pasta do seu projeto. Vamos organizar tudo para que sua IA favorita entenda cada detalhe da sua arquitetura.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
