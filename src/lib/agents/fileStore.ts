import { supabase } from '@/lib/supabase';
import type { GeneratedFile } from './types';

export async function saveGeneratedFiles(
  nodeId: string,
  platform: string,
  files: GeneratedFile[],
  projectId?: string
): Promise<void> {
  let pid = projectId;

  if (!pid) {
    const { data } = await supabase
      .from('projects')
      .insert({ title: 'Untitled Project', description: '' })
      .select('id')
      .maybeSingle();
    pid = data?.id;
  }

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
}

export async function loadGeneratedFiles(
  nodeId: string
): Promise<GeneratedFile[]> {
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
}

export async function updateGeneratedFile(
  nodeId: string,
  filePath: string,
  content: string
): Promise<void> {
  await supabase
    .from('generated_files')
    .update({ file_content: content, updated_at: new Date().toISOString() })
    .eq('node_id', nodeId)
    .eq('file_path', filePath);
}
