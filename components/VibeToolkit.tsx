'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  Key,
  Eye
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { 
  FileData, 
  isRelevantFile, 
  readFileContent, 
  generateBlueprint,
  generateSmartBlueprint,
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

const TOOLKIT_FILES = [
  {
    name: 'groq-agent.ts',
    content: `import Groq from "groq-sdk";
import * as dotenv from "dotenv";
import { promises as fs } from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

interface GroqRequestParams {
    model: string;
    systemContent: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
}

const logger = {
    info: (message: string) => {
        console.log(\`[AI] \${message}\`);
    },
    error: (message: string, error?: any) => {
        console.error(\`[!] ERRO: \${message}\`);
        if (error) {
            if (error.status === 401) {
                console.error("    Sua chave da Groq falhou. Verifique o arquivo .env.");
                console.error("    Dica: Acesse console.groq.com, crie uma nova chave e cole lá.");
            }
            else if (error.status === 429) {
                console.error("    O limite de uso gratuito da Groq foi atingido. Tente novamente em alguns minutos.");
            }
            else {
                console.error(\`    Detalhes técnicos: \${error.message || error}\`);
            }
        }
    }
};

const SYSTEM_PROMPT = \`
Você é um "Mentor de Vibe-Coding Senior". 
Sua tarefa é analisar o código do projeto enviado e gerar um documento de contexto que ajude o usuário (provavelmente um iniciante) a continuar desenvolvendo.

Entregue o seguinte conteúdo em Markdown:
1. **Resumo Executivo:** O que o projeto faz de forma simples e "cool".
2. **Mapa de Vibe:** Quais tecnologias estão sendo usadas e por que elas são boas.
3. **Próximos Passos:** Sugira 3 funcionalidades ou melhorias que o usuário poderia fazer a seguir para evoluir o projeto.
4. **Alerta de Mentor:** Identifique algum "code smell" ou algo que possa ser melhorado na estrutura atual.
5. **Prompt Sugerido:** Um prompt pronto que o usuário pode colar no chat para pedir a primeira melhoria.

Use uma linguagem amigável, direta e cheia de energia positiva (use emojis). Não crie explicações longas ou código novo agora.
\`;

class GroqService {
    private client: Groq;
    constructor() {
        this.client = new Groq({ apiKey: process.env.GROQ_API_KEY || "MISSING_KEY" });
    }

    public async generateContextDocument(params: GroqRequestParams): Promise<string | null> {
        try {
            const response = await this.client.chat.completions.create({
                messages: [{ role: "system", content: params.systemContent }, { role: "user", content: params.userPrompt }],
                model: params.model,
                temperature: 0.1,
            });
            return response.choices[0]?.message?.content || null;
        } catch (error) {
            logger.error("Falha na API Groq", error);
            return null;
        }
    }
}

async function main() {
    if (!process.env.GROQ_API_KEY) {
        logger.error("Ops! Não achamos a sua chave da API da Groq no arquivo .env");
        process.exit(1);
    }

    const [bundlePath, projectName] = process.argv.slice(2);
    if (!bundlePath) process.exit(1);

    const absolutePath = path.resolve(process.cwd(), bundlePath);
    let sourceCodeDump = await fs.readFile(absolutePath, "utf-8");

    sourceCodeDump = sourceCodeDump.replace(/<system_instruction>[\\s\\S]*?<\\/system_instruction>/g, "").trim();

    const groqService = new GroqService();
    const result = await groqService.generateContextDocument({
        model: "llama-3.3-70b-versatile",
        systemContent: SYSTEM_PROMPT,
        userPrompt: \`Analise este projeto '\${projectName}':\\n\\n\${sourceCodeDump}\`,
    });

    if (result) {
        const outputPath = path.resolve(path.dirname(absolutePath), \`_AI_CONTEXT_\${projectName}.md\`);
        const instructionalHeader = \`> # CONTEXTO DO PROJETO\\n\`;
        const finalFile = \`\${instructionalHeader}\${result.trim()}\\n\\n---\\n\\n# ESTRUTURA E CÓDIGO (REFERÊNCIA TÉCNICA)\\n\${sourceCodeDump}\`;
        await fs.writeFile(outputPath, finalFile, "utf-8");
        logger.info("Resumo criado com sucesso e pronto para uso.");
    }
}

main();`
  },
  {
    name: 'package.json',
    content: `{
  "name": "vibetoolkit",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "dotenv": "^17.3.1",
    "groq-sdk": "^0.37.0"
  },
  "devDependencies": {
    "@types/node": "^25.3.2",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3"
  }
}`
  },
  {
    name: 'project-bundler.ps1',
    content: `# VIBE AI TOOLKIT - BUNDLER, BLUEPRINT & SELECTIVE
# =================================================================

[CmdletBinding()]
param([string]$Path = ".")

# Força o console a usar UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location $Path

$ProjectName = (Get-Item .).Name
$ScriptFullPath = $MyInvocation.MyCommand.Path
$ToolkitDir = Split-Path $ScriptFullPath

# ... (rest of the script)
`
  },
  {
    name: 'README.md',
    content: `# ⚡ VibeToolkit: Domine o Vibe-Coding com Contexto Real

O **VibeToolkit** é o seu parceiro definitivo para programar com IAs (ChatGPT, Claude, Gemini). Ele elimina a "amnésia" dos modelos, consolidando seu projeto em um **Blueprint Inteligente** que permite à IA entender sua arquitetura, tecnologias e lógica instantaneamente.

---

## ✨ Recursos Mágicos

*   **🔍 Mapeamento Inteligente:** Varre suas pastas ignorando o lixo (\`node_modules\`, \`dist\`, etc) e focando no que importa.
*   **🧠 Mentor de Código:** Utiliza IA (via Groq) para escrever um resumo didático do seu projeto no topo do arquivo.
*   **🖱️ Integração Nativa:** Clique com o botão direito em qualquer pasta e gere seu contexto em segundos.
*   **📋 Auto-Copy:** Tudo o que a IA precisa já vai direto para a sua área de transferência. Paste & Go!
`
  },
  {
    name: 'setup-menu.ps1',
    content: `# =================================================================
# VibeToolkit - Context Menu & Environment Auto-Installer
# =================================================================
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
# ... (rest of the script)
`
  },
  {
    name: 'tsconfig.json',
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist"
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}`
  }
];

export default function VibeToolkit() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [projectName, setProjectName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'full' | 'smart'>('full');
  const [blueprint, setBlueprint] = useState('');
  const [mentorContext, setMentorContext] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customApiKey, setCustomApiKey] = useState('');
  const [customGroqApiKey, setCustomGroqApiKey] = useState('');
  const [provider, setProvider] = useState<'gemini' | 'groq'>('gemini');
  const [showSettings, setShowSettings] = useState(false);
  const [showRepoView, setShowRepoView] = useState(false);
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
    
    const generated = mode === 'full' 
      ? generateBlueprint(relevantFiles, name)
      : generateSmartBlueprint(relevantFiles, name);
    setBlueprint(generated);
  };

  // Regenerate blueprint when mode changes
  React.useEffect(() => {
    if (files.length > 0 && projectName) {
      const generated = mode === 'full' 
        ? generateBlueprint(files, projectName)
        : generateSmartBlueprint(files, projectName);
      setBlueprint(generated);
    }
  }, [mode, files, projectName]);

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
        // Groq Implementation via Server API
        const response = await fetch('/api/mentor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: 'groq',
            blueprint,
            projectName,
            customApiKey: customGroqApiKey,
            systemPrompt: SYSTEM_PROMPT
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao consultar o Mentor IA');
        }

        setMentorContext(data.text || 'Falha ao gerar contexto.');
      }
    } catch (error: any) {
      console.error('Erro na IA:', error);
      setMentorContext(`Erro: ${error.message || 'Falha ao conectar com o Mentor IA.'}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const copyToClipboard = (text?: string, id: string = 'main') => {
    const fullText = text || (mentorContext 
      ? `> # CONTEXTO DO PROJETO\n${mentorContext}\n\n---\n\n# ESTRUTURA E CÓDIGO\n${blueprint}`
      : blueprint);
    
    navigator.clipboard.writeText(fullText);
    
    if (id === 'main') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const reset = () => {
    setFiles([]);
    setBlueprint('');
    setMentorContext('');
    setProjectName('');
  };

  const downloadToolkitZip = async () => {
    const zip = new JSZip();
    TOOLKIT_FILES.forEach(file => {
      zip.file(file.name, file.content);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'VibeToolkit-main.zip');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 font-sans text-zinc-100">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-white pb-6">
        <div>
          <h1 className="text-6xl font-serif tracking-tighter leading-none text-white">
            VibeToolkit
          </h1>
          <p className="mt-2 text-zinc-500 font-serif text-sm uppercase tracking-widest">
            Contextualizador de Projetos para IA v1.0
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 border-2 border-white transition-all ${showSettings ? 'bg-white text-black' : 'hover:bg-zinc-900'}`}
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
                  className="absolute right-0 mt-2 w-80 bg-black border-2 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] p-6 z-50"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                      <Settings className="w-4 h-4 text-emerald-400" />
                      <h4 className="font-black text-xs uppercase tracking-widest text-white">Configurações de IA</h4>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-500">Provedor</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => saveProvider('gemini')}
                          className={`p-2 text-[10px] font-bold uppercase border-2 transition-all ${
                            provider === 'gemini' ? 'border-emerald-400 bg-emerald-400 text-black' : 'border-zinc-800 hover:border-white'
                          }`}
                        >
                          Gemini
                        </button>
                        <button 
                          onClick={() => saveProvider('groq')}
                          className={`p-2 text-[10px] font-bold uppercase border-2 transition-all ${
                            provider === 'groq' ? 'border-emerald-400 bg-emerald-400 text-black' : 'border-zinc-800 hover:border-white'
                          }`}
                        >
                          Groq (Llama)
                        </button>
                      </div>
                    </div>

                    {provider === 'gemini' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Key className="w-3 h-3 text-emerald-400" />
                          <label className="text-[10px] font-bold uppercase text-zinc-500">Gemini API Key</label>
                        </div>
                        <input 
                          type="password"
                          value={customApiKey}
                          onChange={(e) => saveApiKey(e.target.value)}
                          placeholder="AIza..."
                          className="w-full p-3 bg-zinc-900 border border-zinc-800 font-mono text-xs focus:outline-none focus:border-emerald-400 transition-colors text-white"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Key className="w-3 h-3 text-orange-400" />
                          <label className="text-[10px] font-bold uppercase text-zinc-500">Groq API Key</label>
                        </div>
                        <input 
                          type="password"
                          value={customGroqApiKey}
                          onChange={(e) => saveGroqApiKey(e.target.value)}
                          placeholder="gsk_..."
                          className="w-full p-3 bg-zinc-900 border border-zinc-800 font-mono text-xs focus:outline-none focus:border-orange-400 transition-colors text-white"
                        />
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                      <span className="text-[10px] font-bold uppercase text-zinc-500">Status:</span>
                      <span className={`text-[10px] font-bold uppercase ${
                        (provider === 'gemini' && customApiKey) || (provider === 'groq' && customGroqApiKey) 
                          ? 'text-emerald-400' 
                          : 'text-zinc-500'
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

          <button 
            onClick={() => setShowRepoView(true)}
            className="px-6 py-3 border-2 border-white font-bold hover:bg-zinc-900 transition-all flex items-center gap-2 text-sm uppercase tracking-tighter"
            title="Baixar para rodar local"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Baixar Local</span>
          </button>

          {!blueprint ? (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="group relative px-8 py-4 bg-white text-black font-bold text-lg hover:bg-emerald-400 transition-colors flex items-center gap-3 overflow-hidden"
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
              className="px-6 py-3 border-2 border-white font-bold hover:bg-white hover:text-black transition-all flex items-center gap-2"
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
              <div className="p-6 bg-zinc-900 border-2 border-white space-y-4">
                <h3 className="font-black text-xs uppercase tracking-tighter border-b border-zinc-800 pb-2 text-zinc-400">Status do Projeto</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-zinc-500">Arquivos:</span>
                    <span className="font-bold text-white">{files.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-zinc-500">Tokens Est.:</span>
                    <span className="font-bold text-white">{Math.round(blueprint.length / 4)}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-zinc-900 border-2 border-white space-y-4">
                <h3 className="font-black text-xs uppercase tracking-tighter border-b border-zinc-800 pb-2 text-zinc-400">Modo de Coleta</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => setMode('full')}
                    className={`p-3 text-xs font-bold uppercase border-2 transition-all ${
                      mode === 'full' ? 'border-emerald-400 bg-emerald-400 text-black' : 'border-zinc-800 hover:border-white text-zinc-400'
                    }`}
                  >
                    Copiar Tudo
                  </button>
                  <button 
                    onClick={() => setMode('smart')}
                    className={`p-3 text-xs font-bold uppercase border-2 transition-all ${
                      mode === 'smart' ? 'border-emerald-400 bg-emerald-400 text-black' : 'border-zinc-800 hover:border-white text-zinc-400'
                    }`}
                  >
                    Inteligente (Contratos)
                  </button>
                </div>
              </div>

              <button 
                onClick={generateAIContext}
                disabled={isGeneratingAI || !!mentorContext}
                className={`w-full p-6 flex flex-col items-center gap-3 border-2 border-white transition-all ${
                  mentorContext 
                    ? 'bg-zinc-900 text-zinc-600 cursor-default' 
                    : 'bg-emerald-400 text-black hover:bg-emerald-300 font-bold'
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
                onClick={() => copyToClipboard()}
                className="w-full p-6 bg-white text-black flex flex-col items-center gap-3 border-2 border-white hover:bg-zinc-100 transition-all font-bold"
              >
                {copied ? <Check className="w-8 h-8 text-emerald-600" /> : <Copy className="w-8 h-8" />}
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
                  className="p-8 bg-zinc-900 border-2 border-emerald-500/50 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest">
                    AI Mentor Feedback
                  </div>
                  <div className="prose prose-invert max-w-none 
                    prose-headings:text-white prose-headings:font-bold prose-headings:border-b prose-headings:border-zinc-800 prose-headings:pb-2 prose-headings:mt-8 first:prose-headings:mt-0
                    prose-p:text-zinc-300 prose-p:my-4
                    prose-ul:list-disc prose-ol:list-decimal">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl mb-4 border-b border-zinc-800 pb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl mb-4 border-b border-zinc-800 pb-2 mt-8" {...props} />,
                        code({node, inline, className, children, ...props}: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeContent = String(children).replace(/\n$/, '');
                          const codeId = Math.random().toString(36).substring(2, 9);

                          return !inline && match ? (
                            <div className="relative group my-4 rounded-md overflow-hidden border border-zinc-800 bg-[#0d1117]">
                              <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-zinc-800">
                                <span className="text-xs font-mono text-zinc-400">{match[1]}</span>
                                <button
                                  onClick={() => copyToClipboard(codeContent, codeId)}
                                  className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white"
                                >
                                  {copiedId === codeId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                              </div>
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{
                                  margin: 0,
                                  padding: '1rem',
                                  background: 'transparent',
                                  fontSize: '0.85rem',
                                  lineHeight: '1.5',
                                }}
                                {...props}
                              >
                                {codeContent}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono text-sm" {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {mentorContext}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              )}

              {/* Blueprint Preview */}
              <div className="border-2 border-white">
                <div className="bg-white text-black px-4 py-2 flex justify-between items-center">
                  <span className="font-mono text-xs uppercase tracking-widest">Blueprint Preview</span>
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="p-6 bg-zinc-900 max-h-[800px] overflow-y-auto custom-scrollbar">
                  <div className="prose prose-invert max-w-none 
                    prose-headings:text-white prose-headings:font-bold prose-headings:border-b prose-headings:border-zinc-800 prose-headings:pb-2 prose-headings:mt-8 first:prose-headings:mt-0
                    prose-p:text-zinc-300 prose-p:my-4
                    prose-hr:border-zinc-800
                    prose-ul:list-disc prose-ol:list-decimal">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl mb-4 border-b border-zinc-800 pb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl mb-4 border-b border-zinc-800 pb-2 mt-8" {...props} />,
                        code({node, inline, className, children, ...props}: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeContent = String(children).replace(/\n$/, '');
                          const codeId = Math.random().toString(36).substring(2, 9);

                          return !inline && match ? (
                            <div className="relative group my-4 rounded-md overflow-hidden border border-zinc-800 bg-[#0d1117]">
                              <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-zinc-800">
                                <span className="text-xs font-mono text-zinc-400">{match[1]}</span>
                                <button
                                  onClick={() => copyToClipboard(codeContent, codeId)}
                                  className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white"
                                  title="Copy code"
                                >
                                  {copiedId === codeId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                              </div>
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{
                                  margin: 0,
                                  padding: '1rem',
                                  background: 'transparent',
                                  fontSize: '0.85rem',
                                  lineHeight: '1.5',
                                }}
                                {...props}
                              >
                                {codeContent}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono text-sm" {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {blueprint}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!blueprint && !isProcessing && (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
          <div className="p-8 bg-zinc-900 rounded-full border-2 border-dashed border-zinc-800">
            <Upload className="w-16 h-16 text-zinc-700" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Pronto para o Vibe-Coding?</h2>
            <p className="text-zinc-500 max-w-md mx-auto">
              Selecione a pasta do seu projeto. Vamos organizar tudo para que sua IA favorita entenda cada detalhe da sua arquitetura.
            </p>
          </div>
        </div>
      )}
      <AnimatePresence>
        {showRepoView && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-5xl bg-[#0d1117] border border-[#30363d] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-xl"
            >
              {/* GitHub Style Header */}
              <div className="bg-[#161b22] border-b border-[#30363d] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#21262d] rounded-md border border-[#30363d]">
                    <FolderOpen className="w-5 h-5 text-[#8b949e]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#58a6ff] hover:underline cursor-pointer font-medium">SandroBreaker</span>
                      <span className="text-[#8b949e]">/</span>
                      <span className="font-semibold text-[#c9d1d9] hover:underline cursor-pointer">VibeToolkit</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 text-[#8b949e] text-[12px] font-medium rounded-full border border-[#30363d]">Public</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRepoView(false)}
                  className="p-2 hover:bg-[#30363d] rounded-md transition-colors text-[#8b949e]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Repo Content */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0d1117]">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-[#8b949e] bg-[#21262d] px-3 py-1.5 rounded-md border border-[#30363d] cursor-pointer hover:bg-[#30363d]">
                      <span className="font-semibold text-[#c9d1d9]">main</span>
                      <ChevronRight className="w-3 h-3 rotate-90" />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#8b949e]">
                      <div className="flex items-center gap-1 hover:text-[#58a6ff] cursor-pointer">
                        <span className="font-semibold text-[#c9d1d9]">1</span>
                        <span>branches</span>
                      </div>
                      <div className="flex items-center gap-1 hover:text-[#58a6ff] cursor-pointer">
                        <span className="font-semibold text-[#c9d1d9]">1</span>
                        <span>tags</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={downloadToolkitZip}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded-md transition-all text-sm"
                  >
                    <Download className="w-4 h-4" />
                    DOWNLOAD ZIP
                  </button>
                </div>

                {/* File List */}
                <div className="border border-[#30363d] rounded-md overflow-hidden">
                  <div className="bg-[#161b22] px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#238636] flex items-center justify-center text-[10px] font-bold text-white">S</div>
                      <span className="text-sm text-[#c9d1d9]">
                        <span className="font-semibold hover:text-[#58a6ff] cursor-pointer">SandroBreaker</span>
                        <span className="ml-2 text-[#8b949e]">Initial release of VibeToolkit</span>
                      </span>
                    </div>
                    <span className="text-xs text-[#8b949e]">agora</span>
                  </div>
                  
                  <div className="divide-y divide-[#30363d]">
                    {TOOLKIT_FILES.map((file) => (
                      <div key={file.name} className="flex items-center justify-between px-4 py-2.5 hover:bg-[#161b22] transition-colors group">
                        <div className="flex items-center gap-3">
                          {file.name.endsWith('.ps1') ? (
                            <Terminal className="w-4 h-4 text-[#8b949e]" />
                          ) : (
                            <FileCode className="w-4 h-4 text-[#8b949e]" />
                          )}
                          <span className="text-sm text-[#c9d1d9] hover:text-[#58a6ff] hover:underline cursor-pointer">{file.name}</span>
                        </div>
                        <span className="text-sm text-[#8b949e] hidden sm:inline">Initial commit</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* README Preview */}
                <div className="mt-8 border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
                  <div className="bg-[#161b22] px-4 py-3 border-b border-[#30363d] flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-[#8b949e]" />
                    <span className="text-xs font-bold text-[#c9d1d9] uppercase tracking-widest">README.md</span>
                  </div>
                  <div className="p-8 prose prose-invert prose-sm max-w-none prose-headings:border-b prose-headings:border-[#30363d] prose-headings:pb-2">
                    <ReactMarkdown>
                      {TOOLKIT_FILES.find(f => f.name === 'README.md')?.content || ''}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              <div className="bg-[#161b22] border-t border-[#30363d] p-4 flex justify-end">
                <button 
                  onClick={() => setShowRepoView(false)}
                  className="px-4 py-2 text-xs font-bold uppercase text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
