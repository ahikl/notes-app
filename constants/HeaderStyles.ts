import { StyleSheet } from 'react-native';

// 全局统一的 header 样式配置
export const HeaderStyles = StyleSheet.create({
  // 标准 header 容器样式
  standardHeader: {
    // 设置主轴方向为水平方向
    flexDirection: 'row',
    // 垂直居中对齐子元素
    alignItems: 'center',
    // 主轴两端对齐，中间有间隔
    justifyContent: 'space-between',
    // 水平方向内边距为20
    paddingHorizontal: 20,
    // 顶部内边距为20
    paddingTop: 20,
    // 底部内边距为15
    paddingBottom: 15,
    // 背景色为白色
    backgroundColor: '#fff',
  },

  // 带边框的 header 容器样式
  borderedHeader: {
    // 设置主轴方向为水平方向
    flexDirection: 'row',
    // 垂直居中对齐子元素
    alignItems: 'center',
    // 主轴两端对齐，中间有间隔
    justifyContent: 'space-between',
    // 水平方向内边距为20
    paddingHorizontal: 20,
    // 顶部内边距为20
    paddingTop: 20,
    // 底部内边距为15
    paddingBottom: 15,
    // 背景色为白色
    backgroundColor: '#FFF',
    // 底部边框宽度为1
    borderBottomWidth: 1,
    // 底部边框颜色为浅灰色
    borderBottomColor: '#F0F0F0',
  },

  // 简化 header 容器样式
  simpleHeader: {
    // 设置主轴方向为水平方向
    flexDirection: 'row',
    // 垂直居中对齐子元素
    alignItems: 'center',
    // 水平方向内边距为20
    paddingHorizontal: 20,
    // 顶部内边距为20
    paddingTop: 20,
    // 底部内边距为15
    paddingBottom: 15,
    // 底部边框宽度为1
    borderBottomWidth: 1,
    // 底部边框颜色为中灰色
    borderBottomColor: '#e0e0e0',
    // 背景色为白色
    backgroundColor: '#fff',
  },

  // 按钮样式
  backButton: {
    // 内边距为5
    padding: 5,
    // 右外边距为10
    marginRight: 10,
  },

  // 返回按钮样式（带文字）
  backButtonText: {
    // 设置主轴方向为水平方向
    flexDirection: 'row',
    // 垂直居中对齐子元素
    alignItems: 'center',
    // 垂直方向内边距为8
    paddingVertical: 8,
    // 水平方向内边距为4
    paddingHorizontal: 4,
  },

  // 标题文字样式
  headerTitle: {
    // 字体大小为20
    fontSize: 20,
    // 字体粗细为粗体
    fontWeight: 'bold',
  },

  // 带文字的返回按钮样式
  backText: {
    // 字体大小为16
    fontSize: 16,
    // 字体颜色为深灰色
    color: '#333',
    // 左外边距为2
    marginLeft: 2,
    // 字体粗细为500
    fontWeight: '500',
  },

  // 右侧图标容器
  headerIcons: {
    // 设置主轴方向为水平方向
    flexDirection: 'row',
  },

  // 图标按钮样式
  headerIcon: {
    // 左外边距为15
    marginLeft: 15,
    // 内边距为5
    padding: 5,
  },
});

// 统一的 header 高度常量
export const HeaderConstants = {
  // 顶部内边距为20
  paddingTop: 20,
  // 底部内边距为15
  paddingBottom: 15,
  // 水平方向内边距为20
  paddingHorizontal: 20,
  // 总垂直内边距为35，等于顶部内边距+底部内边距
  totalVerticalPadding: 35, // paddingTop + paddingBottom
};
