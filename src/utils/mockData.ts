import type { User } from '../types';

export const MOCK_MEMBERS: User[] = [
  {
    id: 'LEADER_MOCK_ID',
    groupId: 'MOCK_GROUP',
    name: '田中(リーダー)',
    iconUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leader&backgroundColor=ffdfbf',
    currentLat: 35.681236, // Tokyo Station roughly
    currentLng: 139.767125,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'MEMBER_2_ID',
    groupId: 'MOCK_GROUP',
    name: '佐藤(はぐれ気味)',
    iconUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sato&backgroundColor=b6e3f4',
    currentLat: 35.681600,
    currentLng: 139.768000,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'MEMBER_3_ID',
    groupId: 'MOCK_GROUP',
    name: '鈴木',
    iconUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Suzuki&backgroundColor=c0aede',
    currentLat: 35.681000,
    currentLng: 139.767000,
    lastUpdated: new Date().toISOString()
  }
];

// Returns a slightly moved lat/lng around a center point
export const getSimulatedMovement = (lat: number, lng: number, maxDistance: number = 0.0001) => {
  const latMove = (Math.random() - 0.5) * maxDistance;
  const lngMove = (Math.random() - 0.5) * maxDistance;
  return {
    lat: lat + latMove,
    lng: lng + lngMove
  };
};

// Calculates distance in meters between two coordinates (Hubeny's rough approximation or basic Haversine)
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
};
