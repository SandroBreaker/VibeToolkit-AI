export interface FileData {
  name: string;
  path: string;
  content: string;
  extension: string;
}

export const IGNORED_DIRS = [
  'node_modules', '.git', 'dist', 'build', '.next', '.cache', 'out',
  'android', 'ios', 'coverage', '.venv', 'venv', 'env', '__pycache__',
  'bin', 'obj', 'target', 'vendor'
];

export const IGNORED_FILES = [
  'package-lock.json', 
  'pnpm-lock.yaml', 
  'yarn.lock', 
  'composer.lock',
  'poetry.lock',
  'Cargo.lock',
  'mix.lock',
  'bun.lockb',
  '.DS_Store', 
  'metadata.json', 
  '.gitignore',
  '.env',
  '.env.local',
  '.env.example',
  'google-services.json',
  'favicon.ico',
  'LICENSE',
  'README.md' // Opcional: ignorar README se quiser focar apenas em código
];

export const ALLOWED_EXTENSIONS = [
  '.tsx', '.ts', '.js', '.jsx', '.css', '.html', '.json', '.prisma', '.sql', '.yaml', '.yml',
  '.py', '.java', '.cs', '.c', '.cpp', '.h', '.hpp', '.go', '.rb', '.php', '.rs', '.swift', '.kt', '.scala', '.dart', '.sh'
];

// Extensões explicitamente proibidas (Blacklist de Mídia/Tokens)
export const FORBIDDEN_EXTENSIONS = [
  '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz', '.tar', '.mp4', '.mp3', '.woff', '.woff2', '.ttf', '.eot'
];

export function getExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
}

export function isRelevantFile(file: File): boolean {
  const name = file.name;
  const path = (file as any).webkitRelativePath || name;
  const ext = `.${getExtension(name)}`;

  // 1. Check ignored directories in path
  const pathParts = path.split('/');
  if (pathParts.some((part: string) => IGNORED_DIRS.includes(part))) return false;

  // 2. Check explicitly forbidden extensions (Media/Binary)
  if (FORBIDDEN_EXTENSIONS.includes(ext)) return false;

  // 3. Check ignored files (Lockfiles, Configs)
  if (IGNORED_FILES.includes(name)) return false;

  // 4. Check allowed extensions (Whitelist)
  if (!ALLOWED_EXTENSIONS.includes(ext)) return false;

  return true;
}

export async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

export function generateBlueprint(files: FileData[], projectName: string): string {
  let blueprint = `# MODO COPIAR TUDO: ${projectName}\n\n`;
  
  blueprint += `## 1. PROJECT STRUCTURE\n\`\`\`text\n`;
  files.forEach(f => {
    blueprint += `${f.path}\n`;
  });
  blueprint += `\`\`\`\n\n`;

  blueprint += `## 2. SOURCE FILES\n\n`;
  files.forEach(f => {
    blueprint += `### File: ${f.path}\n`;
    blueprint += `\`\`\`${f.extension || 'text'}\n`;
    blueprint += `${f.content.trim()}\n`;
    blueprint += `\`\`\`\n\n`;
  });

  return blueprint;
}

export function extractSignatures(content: string, extension: string): string {
  if (!['ts', 'tsx', 'js', 'jsx'].includes(extension)) {
    // Para outros arquivos, pegamos as primeiras 10 linhas como "assinatura" ou resumo
    return content.split('\n').slice(0, 10).join('\n') + (content.split('\n').length > 10 ? '\n...' : '');
  }

  const lines = content.split('\n');
  const signatures: string[] = [];
  
  // Regex para capturar assinaturas comuns em JS/TS
  // Captura interfaces, classes, tipos, enums, funções e constantes importantes
  const signatureRegex = /^(export\s+)?(interface|class|type|enum|const|function|async\s+function)\s+([a-zA-Z0-9_]+)/;
  
  let inInterface = false;
  let interfaceContent: string[] = [];
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Lógica simples para capturar blocos de interface/type/enum completos (geralmente curtos e importantes)
    if (!inInterface && (line.startsWith('interface ') || line.startsWith('export interface ') || line.startsWith('type ') || line.startsWith('export type ') || line.startsWith('enum ') || line.startsWith('export enum '))) {
      inInterface = true;
      interfaceContent = [lines[i]];
      braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      if (braceCount === 0 && line.includes('{')) braceCount = 1; // Fallback
      if (line.endsWith(';') || (line.includes('{') && line.includes('}') && braceCount === 0)) {
        signatures.push(interfaceContent.join('\n'));
        inInterface = false;
      }
      continue;
    }

    if (inInterface) {
      interfaceContent.push(lines[i]);
      braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      if (braceCount <= 0) {
        signatures.push(interfaceContent.join('\n'));
        inInterface = false;
      }
      continue;
    }

    // Para classes, funções e consts, pegamos apenas a linha da assinatura
    if (signatureRegex.test(line)) {
      // Se for uma constante de string longa ou objeto, tentamos encurtar
      if (line.includes('=') && (line.includes('`') || line.includes('{'))) {
        signatures.push(line.split('=')[0] + '= ...');
      } else {
        signatures.push(lines[i]);
      }
    }
  }

  return signatures.join('\n');
}

export function generateSmartBlueprint(files: FileData[], projectName: string): string {
  const systemInstruction = `<system_instruction>

ROLE: SENIOR_FULLSTACK_ARCHITECT_EXECUTOR
DETERMINISM_MODE: LOW_ENTROPY
OUTPUT_VARIANCE: MINIMIZED

PURPOSE:
Garantir decisões técnicas corretas, previsibilidade do sistema e alta confiabilidade.

ENGINEERING_RULES:
- Tipagem forte sempre que disponível.
- Contratos explícitos entre camadas.
- Princípios de design aplicados de forma consistente.
- Nenhuma alteração não solicitada.
- Preservação total de comportamento existente.

EFFICIENCY_POLICY:
- Priorizar soluções simples e performáticas.
- Eliminar desperdícios computacionais.
- Evitar estados ou dependências desnecessárias.

STABILITY_STANDARD:
- Tratamento explícito de falhas.
- Considerar cenários limites.
- Nenhuma operação assíncrona sem controle.

DELIVERY_CONSTRAINTS:
- Saídas completas e utilizáveis.
- Escopo rigidamente respeitado.
- Identificadores preservados.

COMMUNICATION:
- Direta, técnica e objetiva.
- Código acima de explicações.

PROCESS:
1. Receber contexto.
2. Avaliar sem modificar.
3. Executar conforme instruções.
4. Aguardar continuidade.

</system_instruction>\n\n`;

  let blueprint = systemInstruction;
  blueprint += `# MODO INTELIGENTE: ${projectName}\n\n`;

  // Tech Stack (Tentamos extrair do package.json se existir)
  const pkgJson = files.find(f => f.name === 'package.json');
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson.content);
      blueprint += `## 1. TECH STACK\n`;
      if (pkg.dependencies) {
        blueprint += `* **Deps:** ${Object.keys(pkg.dependencies).join(', ')}\n`;
      }
      if (pkg.devDependencies) {
        blueprint += `* **Dev Deps:** ${Object.keys(pkg.devDependencies).join(', ')}\n`;
      }
      blueprint += `\n`;
    } catch (e) {
      blueprint += `## 1. TECH STACK\n* (Erro ao ler package.json)\n\n`;
    }
  }

  blueprint += `## 2. PROJECT STRUCTURE\n\`\`\`text\n`;
  files.forEach(f => {
    blueprint += `${f.path}\n`;
  });
  blueprint += `\`\`\`\n\n`;

  blueprint += `## 3. CORE DOMAINS & CONTRACTS\n\n`;
  files.forEach(f => {
    const sigs = extractSignatures(f.content, f.extension);
    if (sigs.trim()) {
      blueprint += `### File: ${f.path}\n`;
      blueprint += `\`\`\`${f.extension || 'text'}\n`;
      blueprint += `${sigs}\n`;
      blueprint += `\`\`\`\n\n`;
    }
  });

  return blueprint;
}
