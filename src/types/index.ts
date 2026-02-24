export interface User {
  id: string;
  groupId: string;
  name: string;
  iconUrl: string | null;
  currentLat: number;
  currentLng: number;
  lastUpdated: string; // ISO string
}

export interface Group {
  id: string;
  leaderId: string;
  alertDistance: number; // in meters
}

export interface AppState {
  currentUser: User | null;
  currentGroup: Group | null;
  groupMembers: User[];
}
