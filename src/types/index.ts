export * from '../../shared/types'
export * from '../../shared/constants'

/** Valid page route paths */
export type PageRoute = '/' | '/knowledge' | '/audit' | '/settings' | '/onboarding'

/** Navigation menu item */
export interface NavItem {
  label: string
  path: string
  icon: string
}
