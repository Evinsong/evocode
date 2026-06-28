/** Page route paths used throughout the application */
export const ROUTES = {
  HOME: '/',
  KNOWLEDGE: '/knowledge',
  AUDIT: '/audit',
  SETTINGS: '/settings',
  ONBOARDING: '/onboarding',
} as const

/** Application title */
export const APP_TITLE = 'EvoCode'

/** Application subtitle */
export const APP_SUBTITLE = '易码 - 多平台编码 Agent'

/** Navigation menu items configuration */
export const NAV_ITEMS = [
  { label: '工作台', path: ROUTES.HOME, icon: 'Code2' },
  { label: '知识库', path: ROUTES.KNOWLEDGE, icon: 'BookOpen' },
  { label: '审计日志', path: ROUTES.AUDIT, icon: 'History' },
  { label: '设置', path: ROUTES.SETTINGS, icon: 'Settings' },
] as const

/** Common UI text */
export const UI_TEXT = {
  LOADING: '加载中...',
  EMPTY: '暂无数据',
  ERROR: '发生错误',
  CONFIRM: '确认',
  CANCEL: '取消',
  SAVE: '保存',
  DELETE: '删除',
  EDIT: '编辑',
  CLOSE: '关闭',
  SUBMIT: '提交',
  RESET: '重置',
} as const
