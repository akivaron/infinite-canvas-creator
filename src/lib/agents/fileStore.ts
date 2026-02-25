import { useCanvasStore } from '@/stores/canvasStore';
import type { GeneratedFile } from './types';

function getOrCreateProjectId(): string {
  const store = useCanvasStore.getState();
  if (store.projectId) return store.projectId;

  const newProjectId = Date.now().toString();
  store.setProjectId(newProjectId);
  return newProjectId;
}

export async function saveGeneratedFiles(
  nodeId: string,
  platform: string,
  files: GeneratedFile[]
): Promise<void> {
  try {
    const pid = getOrCreateProjectId();

    const storageKey = `files_${pid}_${nodeId}`;
    const fileData = {
      nodeId,
      platform,
      files,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(storageKey, JSON.stringify(fileData));
  } catch (err) {
    console.error('Failed to save generated files:', err);
  }
}

export async function loadGeneratedFiles(
  nodeId: string
): Promise<GeneratedFile[]> {
  try {
    const store = useCanvasStore.getState();
    if (!store.projectId) return [];

    const storageKey = `files_${store.projectId}_${nodeId}`;
    const dataStr = localStorage.getItem(storageKey);

    if (!dataStr) return [];

    const data = JSON.parse(dataStr);
    return data.files || [];
  } catch {
    return [];
  }
}

export async function updateGeneratedFile(
  nodeId: string,
  filePath: string,
  content: string
): Promise<void> {
  try {
    const files = await loadGeneratedFiles(nodeId);
    const updatedFiles = files.map(f =>
      f.path === filePath ? { ...f, content } : f
    );

    const store = useCanvasStore.getState();
    if (!store.projectId) return;

    const storageKey = `files_${store.projectId}_${nodeId}`;
    const fileData = {
      nodeId,
      files: updatedFiles,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(storageKey, JSON.stringify(fileData));
  } catch (err) {
    console.error('Failed to update generated file:', err);
  }
}
