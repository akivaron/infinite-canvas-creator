import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useCanvasStore } from '@/stores/canvasStore';
import type { GeneratedFile } from './types';

async function getOrCreateProjectId(): Promise<string | null> {
  const store = useCanvasStore.getState();
  if (store.projectId) return store.projectId;

  const { data } = await supabase
    .from('projects')
    .insert({ title: 'Untitled Project', description: '' })
    .select('id')
    .maybeSingle();

  if (data?.id) {
    store.setProjectId(data.id);
    return data.id;
  }
  return null;
}

export async function saveGeneratedFiles(
  nodeId: string,
  platform: string,
  files: GeneratedFile[]
): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const pid = await getOrCreateProjectId();
    if (!pid) return;

    await supabase
      .from('generated_files')
      .delete()
      .eq('node_id', nodeId);

    const rows = files.map((f) => ({
      project_id: pid,
      node_id: nodeId,
      platform,
      file_path: f.path,
      file_content: f.content,
      language: f.language,
    }));

    if (rows.length > 0) {
      await supabase.from('generated_files').insert(rows);
    }
  } catch (err) {
    console.error('Failed to save generated files:', err);
  }
}

export async function loadGeneratedFiles(
  nodeId: string
): Promise<GeneratedFile[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data } = await supabase
      .from('generated_files')
      .select('file_path, file_content, language')
      .eq('node_id', nodeId)
      .order('file_path');

    if (!data) return [];

    return data.map((row) => ({
      path: row.file_path,
      content: row.file_content,
      language: row.language,
    }));
  } catch {
    return [];
  }
}

export async function updateGeneratedFile(
  nodeId: string,
  filePath: string,
  content: string
): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    await supabase
      .from('generated_files')
      .update({ file_content: content, updated_at: new Date().toISOString() })
      .eq('node_id', nodeId)
      .eq('file_path', filePath);
  } catch (err) {
    console.error('Failed to update generated file:', err);
  }
}
