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
