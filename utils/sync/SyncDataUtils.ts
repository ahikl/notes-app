/**
 * 同步数据工具函数
 * 处理笔记数据在同步过程中的 Base64 编码/解码转换
 *
 * 设计原则：
 * 1. 传输层：所有加密相关字段（content, iv, auth_tag）使用 Base64 编码
 * 2. 存储层：数据库中直接存储 Base64 字符串（SQLite TEXT 类型）
 * 3. 内存层：Note 对象使用字符串格式
 */

import { DatabaseNote, Note, SyncNote } from '@/types/notes/NoteTypes';

/**
 * 将数据库笔记转换为同步笔记格式（用于 API 传输）
 * 确保所有 content 字段都是 Base64 编码的字符串
 *
 * @param note 数据库笔记对象
 * @returns 同步格式的笔记对象
 */
export const databaseNoteToSyncNote = (note: DatabaseNote): SyncNote => {
  // 对于明文笔记，需要将 content 进行 Base64 编码
  let encodedContent = note.content;
  if (note.is_encrypted !== 1) {
    // 明文笔记，需要 Base64 编码
    encodedContent = Buffer.from(note.content, 'utf8').toString('base64');
  }
  // 加密笔记的 content 已经是 Base64 格式，直接使用

  return {
    id: note.id,
    title: note.title,
    content: encodedContent, // Base64 编码的内容（明文或密文）
    iv: note.iv, // Base64 格式的 IV（仅加密笔记）
    auth_tag: note.auth_tag, // Base64 格式的认证标签（仅加密笔记）
    is_encrypted: note.is_encrypted,
    is_deleted: note.is_deleted, // 包含删除状态用于同步
    created_at: note.created_at,
    updated_at: note.updated_at,
  };
};

/**
 * 将同步笔记转换为数据库笔记格式（用于本地存储）
 * 对于明文笔记，将 Base64 解码回 UTF-8
 * 对于加密笔记，保持 Base64 格式存储
 *
 * @param syncNote 同步格式的笔记对象
 * @param syncStatus 同步状态（可选，默认为0）
 * @param isDeleted 删除状态（可选，默认为0）
 * @returns 数据库格式的笔记对象
 */
export const syncNoteToDatabaseNote = (
  syncNote: SyncNote,
  syncStatus: number = 0,
  isDeleted: number = 0,
): DatabaseNote => {
  // 对于明文笔记，需要将 content 进行 Base64 解码
  let decodedContent = syncNote.content;
  if (syncNote.is_encrypted !== 1) {
    // 明文笔记，需要 Base64 解码
    try {
      decodedContent = Buffer.from(syncNote.content, 'base64').toString('utf8');
    } catch (error) {
      console.error('Base64 解码失败:', error);
      // 如果解码失败，保持原样
    }
  }
  // 加密笔记的 content 保持 Base64 格式存储

  return {
    id: syncNote.id,
    title: syncNote.title,
    content: decodedContent, // 明文笔记是 UTF-8，加密笔记是 Base64
    iv: syncNote.iv, // Base64 编码的 IV
    auth_tag: syncNote.auth_tag, // Base64 编码的认证标签
    is_encrypted: syncNote.is_encrypted,
    sync_status: syncStatus,
    is_deleted: isDeleted,
    created_at: syncNote.created_at,
    updated_at: syncNote.updated_at,
  };
};

/**
 * 将 Note 对象转换为同步格式
 * 用于准备发送给服务器的笔记数据
 *
 * @param note 标准笔记对象
 * @returns 同步格式的笔记对象
 */
export const noteToSyncNote = (note: Note): SyncNote => {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    iv: note.iv,
    auth_tag: note.auth_tag,
    is_encrypted: note.is_encrypted,
    created_at: note.created_at,
    updated_at: note.updated_at,
  };
};

/**
 * 将同步笔记转换为标准 Note 对象
 * 用于接收服务器数据后的处理
 *
 * @param syncNote 同步格式的笔记对象
 * @param syncStatus 同步状态
 * @param isDeleted 删除状态
 * @returns 标准笔记对象
 */
export const syncNoteToNote = (
  syncNote: SyncNote,
  syncStatus: number = 0,
  isDeleted: number = 0,
): Note => {
  return {
    id: syncNote.id,
    title: syncNote.title,
    content: syncNote.content,
    iv: syncNote.iv,
    auth_tag: syncNote.auth_tag,
    is_encrypted: syncNote.is_encrypted,
    sync_status: syncStatus,
    is_deleted: isDeleted,
    created_at: syncNote.created_at,
    updated_at: syncNote.updated_at,
  };
};

/**
 * 批量转换数据库笔记为同步笔记
 *
 * @param notes 数据库笔记数组
 * @returns 同步格式笔记数组
 */
export const databaseNotesToSyncNotes = (notes: DatabaseNote[]): SyncNote[] => {
  return notes.map(databaseNoteToSyncNote);
};

/**
 * 批量转换同步笔记为数据库笔记
 *
 * @param syncNotes 同步格式笔记数组
 * @param syncStatus 同步状态
 * @param isDeleted 删除状态
 * @returns 数据库格式笔记数组
 */
export const syncNotesToDatabaseNotes = (
  syncNotes: SyncNote[],
  syncStatus: number = 0,
  isDeleted: number = 0,
): DatabaseNote[] => {
  return syncNotes.map((note) => syncNoteToDatabaseNote(note, syncStatus, isDeleted));
};

/**
 * 验证 Base64 字符串格式
 *
 * @param str 待验证的字符串
 * @returns 是否为有效的 Base64 字符串
 */
export const isValidBase64 = (str: string | undefined): boolean => {
  if (!str || typeof str !== 'string') {
    return false;
  }

  // Base64 正则表达式
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

  if (!base64Regex.test(str)) {
    return false;
  }

  // 验证长度（Base64 字符串长度必须是 4 的倍数）
  if (str.length % 4 !== 0) {
    return false;
  }

  try {
    // 尝试解码验证
    const decoded = Buffer.from(str, 'base64');
    const reencoded = decoded.toString('base64');
    return reencoded === str;
  } catch {
    return false;
  }
};

/**
 * 验证同步笔记数据的完整性
 * 检查加密笔记是否包含必需的加密字段
 *
 * @param note 同步笔记对象
 * @returns 验证结果
 */
export const validateSyncNote = (note: SyncNote): { valid: boolean; error?: string } => {
  // 基本字段验证
  if (!note.id || typeof note.id !== 'string') {
    return { valid: false, error: '笔记ID不能为空' };
  }

  if (!note.title || typeof note.title !== 'string') {
    return { valid: false, error: '笔记标题不能为空' };
  }

  if (note.content === undefined || note.content === null) {
    return { valid: false, error: '笔记内容不能为空' };
  }

  if (!note.created_at || !note.updated_at) {
    return { valid: false, error: '时间戳不能为空' };
  }

  // 加密笔记验证
  if (note.is_encrypted === 1) {
    // 加密笔记应该有 IV 字段
    if (!note.iv) {
      return { valid: false, error: '加密笔记缺少初始化向量(IV)' };
    }

    // 验证 IV 格式
    if (!isValidBase64(note.iv)) {
      return { valid: false, error: '初始化向量(IV)格式无效' };
    }

    // 验证内容格式
    if (!isValidBase64(note.content)) {
      return { valid: false, error: '加密内容格式无效' };
    }

    // 如果提供了 auth_tag，验证其格式
    if (note.auth_tag && !isValidBase64(note.auth_tag)) {
      return { valid: false, error: '认证标签格式无效' };
    }
  }

  return { valid: true };
};

/**
 * 安全地解析同步响应数据
 * 处理可能的格式错误和数据损坏
 *
 * @param data 原始响应数据
 * @returns 解析后的同步笔记数组
 */
export const parseSyncResponseData = (data: any): SyncNote[] => {
  if (!data || !Array.isArray(data)) {
    console.warn('同步响应数据格式错误：期望数组');
    return [];
  }

  const validNotes: SyncNote[] = [];
  const invalidNotes: { index: number; error: string }[] = [];

  data.forEach((item, index) => {
    const validation = validateSyncNote(item as SyncNote);
    if (validation.valid) {
      validNotes.push(item as SyncNote);
    } else {
      invalidNotes.push({ index, error: validation.error || '未知错误' });
      console.warn(`同步响应中第 ${index} 条笔记验证失败:`, validation.error);
    }
  });

  if (invalidNotes.length > 0) {
    console.warn(`${invalidNotes.length} 条笔记验证失败，已跳过`);
  }

  return validNotes;
};

/**
 * 准备笔记用于同步传输
 * 确保所有字段符合 API 规范
 *
 * @param notes 笔记数组
 * @returns 准备好的同步笔记数组
 */
export const prepareNotesForSync = (notes: Note[]): SyncNote[] => {
  return notes.map((note) => {
    const syncNote = noteToSyncNote(note);

    // 如果是加密笔记，确保内容是 Base64 格式
    if (syncNote.is_encrypted === 1) {
      // 如果内容不是 Base64 格式，需要转换
      // 注意：这里假设 content 已经是加密后的 Base64 字符串
      // 如果 content 是明文，应该在调用此函数之前进行加密
    }

    return syncNote;
  });
};

/**
 * 处理从服务器接收的同步更新
 * 将同步笔记转换为数据库格式并验证
 *
 * @param updates 服务器返回的更新
 * @returns 处理后的数据库笔记数组
 */
export const processSyncUpdates = (updates: SyncNote[]): DatabaseNote[] => {
  const validUpdates = parseSyncResponseData(updates);
  // 保留服务器返回的删除状态
  return validUpdates.map((syncNote) =>
    syncNoteToDatabaseNote(syncNote, 0, syncNote.is_deleted || 0),
  );
};

export default {
  databaseNoteToSyncNote,
  syncNoteToDatabaseNote,
  noteToSyncNote,
  syncNoteToNote,
  databaseNotesToSyncNotes,
  syncNotesToDatabaseNotes,
  isValidBase64,
  validateSyncNote,
  parseSyncResponseData,
  prepareNotesForSync,
  processSyncUpdates,
};
