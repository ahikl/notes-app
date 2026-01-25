import { useNotification } from '@/components/NotificationManager';
import { batchDeleteNotes } from '@/services';
import {
  createNote as createLocalNote,
  deleteNote as deleteLocalNote,
  getNotes as getLocalNotes,
  getNotesStats,
  updateNote as updateLocalNote,
} from '@/services/local/LocalNoteService';
import { CreateNoteRequest, Note } from '@/types/notes/NoteTypes';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LocalStorageDemoProps {
  onBack: () => void;
}

const LocalStorageDemo: React.FC<LocalStorageDemoProps> = ({ onBack }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0 });

  const { showSuccess, showError, showInfo } = useNotification();

  // 加载笔记列表
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getLocalNotes();
      setNotes(result.data);

      // 获取统计信息
      const statsResult = await getNotesStats();
      setStats(statsResult);
    } catch (error) {
      showError('加载笔记失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setNotes, setStats, showError]);

  // 创建示例笔记
  const createSampleNote = async () => {
    try {
      const sampleNote: CreateNoteRequest = {
        title: `示例笔记 ${Date.now()}`,
        content: `这是第 ${notes.length + 1} 个示例笔记的内容。\n创建时间: ${new Date().toLocaleString()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await createLocalNote(sampleNote);
      showSuccess('示例笔记创建成功！');
      await loadNotes(); // 重新加载列表
    } catch (error) {
      showError('创建笔记失败: ' + (error as Error).message);
    }
  };

  // 更新第一个笔记
  const updateFirstNote = async () => {
    if (notes.length === 0) {
      showInfo('没有可更新的笔记');
      return;
    }

    try {
      const firstNote = notes[0];
      await updateLocalNote(firstNote.id, {
        title: firstNote.title + ' (已更新)',
        content: firstNote.content + '\n\n更新时间: ' + new Date().toLocaleString(),
        is_encrypted: 0,
        updated_at: new Date().toISOString(),
      });

      showSuccess('笔记更新成功！');
      await loadNotes();
    } catch (error) {
      showError('更新笔记失败: ' + (error as Error).message);
    }
  };

  // 删除最后一个笔记
  const deleteLastNote = async () => {
    if (notes.length === 0) {
      showInfo('没有可删除的笔记');
      return;
    }

    try {
      const lastNote = notes[notes.length - 1];
      await deleteLocalNote(lastNote.id);
      showSuccess('笔记删除成功！');
      await loadNotes();
    } catch (error) {
      console.error('删除笔记失败:', error);
      // 不显示删除错误的弹窗，仅记录日志
      showError('删除笔记失败: ' + (error as Error).message);
    }
  };

  // 搜索笔记
  const searchNotes = async (searchTerm: string) => {
    try {
      const result = await getLocalNotes({ search: searchTerm });
      setNotes(result.data);
    } catch (error) {
      showError('搜索笔记失败: ' + (error as Error).message);
    }
  };

  // 批量删除笔记（示例：删除前3个笔记）
  const batchDeleteNotesExample = async () => {
    if (notes.length === 0) {
      showInfo('没有可删除的笔记');
      return;
    }

    try {
      const noteIdsToDelete = notes.slice(0, Math.min(3, notes.length)).map((note) => note.id);
      await batchDeleteNotes(noteIdsToDelete);
      showSuccess(`成功批量删除 ${noteIdsToDelete.length} 条笔记！`);
      await loadNotes(); // 重新加载列表
    } catch (error) {
      console.error('批量删除笔记失败:', error);
      // 不显示批量删除错误的弹窗，仅记录日志
      showError('批量删除笔记失败: ' + (error as Error).message);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadNotes();
    };

    fetchData().catch((error) => {
      console.error('加载笔记时发生错误:', error);
    });
  }, [loadNotes]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SQLite 本地存储演示</Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>总笔记数: {stats.total}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={createSampleNote}
          disabled={loading}
        >
          <Text style={styles.buttonText}>创建示例笔记</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={updateFirstNote}
          disabled={notes.length === 0 || loading}
        >
          <Text style={styles.buttonText}>更新第一个笔记</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={deleteLastNote}
          disabled={notes.length === 0 || loading}
        >
          <Text style={styles.buttonText}>删除最后一个笔记</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.textButton]}
          onPress={() => searchNotes('示例')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>搜索"示例"</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.textButton]}
          onPress={loadNotes}
          disabled={loading}
        >
          <Text style={styles.buttonText}>刷新列表</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={batchDeleteNotesExample}
          disabled={notes.length === 0 || loading}
        >
          <Text style={styles.buttonText}>批量删除笔记(前3个)</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.notesList}>
        {notes.map((note) => (
          <View key={note.id} style={styles.noteCard}>
            <Text style={styles.noteTitle}>{note.title}</Text>
            <Text style={styles.noteContent} numberOfLines={3}>
              {note.content}
            </Text>
            <Text style={styles.noteDate}>
              更新时间: {new Date(note.updated_at).toLocaleString()}
            </Text>
          </View>
        ))}

        {notes.length === 0 && !loading && <Text style={styles.emptyText}>暂无笔记</Text>}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 4,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    padding: 12,
    borderRadius: 4,
    marginVertical: 4,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  textButton: {
    backgroundColor: '#f0f0f0',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  notesList: {
    flex: 1,
  },
  noteCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noteContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 32,
  },
});

export default LocalStorageDemo;
