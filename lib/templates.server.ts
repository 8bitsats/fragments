import fs from 'fs/promises'
import path from 'path'

export type TemplateFile = {
  path: string;
  content: string;
};

export async function getTemplateFiles(templateName: string, placeholders: Record<string, string> = {}): Promise<TemplateFile[]> {
  const templateDir = path.join(process.cwd(), 'sandbox-templates', templateName);
  const files: TemplateFile[] = [];

  async function readDirRecursive(dir: string, relPath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      const entryRelPath = path.join(relPath, entry.name);
      if (entry.isDirectory()) {
        await readDirRecursive(entryPath, entryRelPath);
      } else {
        let content = await fs.readFile(entryPath, 'utf8');
        for (const [key, value] of Object.entries(placeholders)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          content = content.replace(regex, value);
        }
        files.push({ path: entryRelPath, content });
      }
    }
  }

  await readDirRecursive(templateDir);
  return files;
} 