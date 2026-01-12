import schedulerService from './scheduler/SchedulerService';

/**
 * 应用初始化服务
 * 负责应用启动时的初始化工作，包括启动定时任务等
 */

class AppInitializationService {
  private static isInitialized = false;

  /**
   * 初始化应用服务
   * @param syncIntervalMs 同步间隔时间（毫秒），默认30分钟
   * @param cleanupIntervalMs 清理间隔时间（毫秒），默认1小时
   */
  public static async initialize(
    syncIntervalMs: number = 30 * 60 * 1000,
    cleanupIntervalMs: number = 60 * 60 * 1000,
  ) {
    if (this.isInitialized) {
      console.log('应用服务已初始化');
      return;
    }

    console.log('开始初始化应用服务...');

    try {
      // 启动定时任务服务
      await schedulerService.start(syncIntervalMs, cleanupIntervalMs);

      this.isInitialized = true;
      console.log('应用服务初始化完成');
    } catch (error) {
      console.error('应用服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 销毁应用服务
   */
  public static destroy() {
    if (!this.isInitialized) {
      return;
    }

    // 停止定时任务服务
    schedulerService.stop();

    this.isInitialized = false;
    console.log('应用服务已销毁');
  }

  /**
   * 检查是否已初始化
   */
  public static isAppInitialized() {
    return this.isInitialized;
  }
}

export default AppInitializationService;
