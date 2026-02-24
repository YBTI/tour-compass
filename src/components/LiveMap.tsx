import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppContext } from '../store/AppContext';
import { calculateDistance } from '../utils/mockData';
import type { User } from '../types';

// Custom Map center update hook
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Custom DivIcon for users with their avatars
const createUserIcon = (user: User, isLeader: boolean) => {
  return L.divIcon({
    className: 'custom-avatar-icon',
    html: `
      <div style="
        width: 40px; height: 40px; border-radius: 50%;
        background-color: white; border: 3px solid ${isLeader ? 'var(--warning)' : 'var(--primary)'};
        box-shadow: ${isLeader ? '0 0 15px var(--warning)' : '0 2px 5px rgba(0,0,0,0.3)'};
        display: flex; align-items: center; justify-content: center; overflow: hidden;
      ">
        <img src="${user.iconUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>
      ${isLeader ? '<div style="position: absolute; top: -10px; right: -5px; font-size: 16px;">👑</div>' : ''}
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export default function LiveMap() {
  const { currentUser, groupMembers, currentGroup } = useAppContext();
  
  if (!currentUser) return null;

  const center: [number, number] = [currentUser.currentLat, currentUser.currentLng];

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }}>
      <MapContainer 
        center={center} 
        zoom={18} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <MapUpdater center={center} />

        {groupMembers.map(member => {
          const isLeader = member.id === currentGroup?.leaderId;
          const isMe = member.id === currentUser.id;
          
          let distStr = '';
          if (!isMe && currentUser) {
            const dist = calculateDistance(
              currentUser.currentLat, currentUser.currentLng,
              member.currentLat, member.currentLng
            );
            distStr = `<br/>距離: ${Math.round(dist)}m`;
          }

          return (
            <Marker 
              key={member.id} 
              position={[member.currentLat, member.currentLng]}
              icon={createUserIcon(member, isLeader)}
              zIndexOffset={isLeader ? 1000 : (isMe ? 500 : 0)}
            >
              <Popup>
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-outfit)' }}>
                  <strong>{member.name} {isMe && '(あなた)'}</strong>
                  {distStr && <div style={{ color: 'var(--text-muted)' }} dangerouslySetInnerHTML={{ __html: distStr }}></div>}
                  <div style={{ fontSize: '0.8em', marginTop: '4px' }}>
                    更新: {new Date(member.lastUpdated).toLocaleTimeString()}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
