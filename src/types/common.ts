export type ThemeMode = 'light' | 'dark';

export interface NavItem {
  id: string;
  label: string;
  path: string;
}

export interface AppInfo {
  name: string;
  version: string;
}
