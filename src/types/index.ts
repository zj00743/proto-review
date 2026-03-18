export interface User {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  url: string;
  is_archived: boolean;
  created_at: string;
  created_by: string;
  created_by_id: string;
  cover_url?: string | null;
}

export interface Anchor {
  tag: string;
  id: string | null;
  className: string | null;
  textSnippet: string;
  selector: string;
  rect: { top: number; left: number; width: number; height: number };
  ownText?: string;
  parentTag?: string | null;
  parentClass?: string | null;
  childCount?: number;
  clickOffsetX?: number;
  clickOffsetY?: number;
}

export interface PinPosition {
  visible: boolean;
  rect: { top: number; left: number; width: number; height: number };
}

export interface Comment {
  id: string;
  project_id: string;
  x_percent: number;
  y_percent: number;
  anchor: Anchor | null;
  page_url: string | null;
  text: string;
  author: string;
  author_id: string;
  created_at: string;
  resolved: boolean;
  parent_id: string | null;
  replies?: Comment[];
  pin_number?: number;
}
