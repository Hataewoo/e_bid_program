import fs from 'fs';
import path from 'path';

export interface TemplateDbCopyResult {
  copied: boolean;
}

/**
 * 배포 최초 실행 시 extraResources 템플릿 DB를 userData로 복사.
 * 이미 DB가 있으면 사용자 데이터를 덮어쓰지 않음.
 */
export function copyProductionDatabaseFromTemplate(options: {
  targetPath: string;
  templatePath: string | null;
}): TemplateDbCopyResult {
  const { targetPath, templatePath } = options;
  const targetDir = path.dirname(targetPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (fs.existsSync(targetPath)) {
    return { copied: false };
  }

  if (!templatePath || !fs.existsSync(templatePath)) {
    return { copied: false };
  }

  fs.copyFileSync(templatePath, targetPath);
  return { copied: true };
}
