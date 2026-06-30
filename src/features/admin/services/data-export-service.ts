import { electronService } from '@/services';
import type { DbOperationResult } from '@/types/electron';

export async function saveTextFileWithDialog(
  defaultName: string,
  content: string,
  title?: string,
): Promise<DbOperationResult> {
  if (!electronService.isAvailable()) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = defaultName;
    anchor.click();
    URL.revokeObjectURL(url);
    return { success: true, path: defaultName };
  }

  return electronService.saveTextFile({ defaultName, content, title });
}

function downloadBase64File(
  defaultName: string,
  base64: string,
  mimeType: string,
): DbOperationResult {
  const binary = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  const blob = new Blob([binary], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = defaultName;
  anchor.click();
  URL.revokeObjectURL(url);
  return { success: true, path: defaultName };
}

export async function saveBinaryFileWithDialog(
  defaultName: string,
  base64: string,
  title?: string,
): Promise<DbOperationResult> {
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (!electronService.isAvailable()) {
    return downloadBase64File(defaultName, base64, mimeType);
  }

  const result = await electronService.saveBinaryFile({ defaultName, base64, title });
  if (result.cancelled) {
    return { success: false, cancelled: true };
  }
  return result;
}
