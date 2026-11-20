// Shapes exchanged between the app and the API.
import type { Gift, Occasion, Relation } from './catalog';

export interface Me {
  name: string;
  email: string;
  isAdmin: boolean;
}

export interface Rating {
  average: number;
  count: number;
}

export interface Review {
  name: string;
  rating: number;
  text: string;
  createdAt: string;
  mine: boolean;
  /** Present only for catalog managers, so they can remove a review. */
  author?: string;
}

export interface Reminder {
  id: string;
  /** Who the occasion is for, e.g. "אמא". */
  name: string;
  occasion: Occasion;
  relation: Relation | null;
  /** YYYY-MM-DD. For a yearly reminder only the month and day matter. */
  date: string;
  yearly: boolean;
}

export interface Bootstrap {
  /** False when no database is connected: accounts, reviews and reminders are unavailable. */
  storage: boolean;
  me: Me | null;
  catalog: Gift[];
  favorites: string[];
  reminders: Reminder[];
  ratings: Record<string, Rating>;
  /** Gift ids ordered by how many people saved them. */
  popular: string[];
}
