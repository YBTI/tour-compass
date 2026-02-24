import { useEffect, useState } from 'react';
import { useAppContext } from '../store/AppContext';
import LiveMap from '../components/LiveMap';
import { calculateDistance } from '../utils/mockData';
import { AlertTriangle, ShieldCheck, PhoneCall, MapPin, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MapPage() {
  const navigate = useNavigate();
  const { currentUser, currentGroup, groupMembers, updateMemberLocation, fetchGroupMembers, leaveGroup } = useAppContext();
  const [isSOS, setIsSOS] = useState(false);
  const [lostAlert, setLostAlert] = useState(false);

  // 初回マウント時にメンバー一覧を取り直す
  useEffect(() => {
    if (currentGroup) {
      fetchGroupMembers(currentGroup.id);
    }
  }, [currentGroup?.id]);

  // 自分自身のGPS位置取得 (Geolocation API)
  useEffect(() => {
    if (!navigator.geolocation || !currentUser) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateMemberLocation(currentUser.id, latitude, longitude);
      },
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 } // タイムアウトを15秒に延長
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [currentUser?.id]);

  // はぐれ判定アラート
  useEffect(() => {
    if (!currentUser || !currentGroup) return;
    const leader = groupMembers.find(m => m.id === currentGroup.leaderId);
    if (!leader) return;

    const dist = calculateDistance(
      currentUser.currentLat, currentUser.currentLng,
      leader.currentLat, leader.currentLng
    );
    
    if (dist > currentGroup.alertDistance && currentUser.id !== leader.id) {
      if (!lostAlert) {
        setLostAlert(true);
        // 通常はここでPush通知などを飛ばす
      }
    } else {
      setLostAlert(false);
    }
  }, [currentUser?.currentLat, currentUser?.currentLng, groupMembers]);

  if (!currentUser || !currentGroup) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}>
        <Loader2 size={48} className="animate-spin" style={{ margin: '0 auto 20px', display: 'block' }} />
        <p>読み込み中、またはセッションが切れました。</p>
        <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ marginTop: '20px' }}>
          トップへ戻る
        </button>
      </div>
    );
  }

  return (
    <div className="map-page-container">
      {/* 画面上部のステータスバー */}
      <div 
        className="glass-panel" 
        style={{ 
          position: 'absolute', top: 20, left: 20, right: 20, zIndex: 1000,
          padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.95)', color: 'var(--text-main)',
          borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
          border: '1px solid var(--surface-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} color="var(--primary)" />
          <span>Group: <strong>{currentGroup.id}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {groupMembers.length} メンバー
          </div>
          <button 
            onClick={() => {
              leaveGroup();
              navigate('/');
            }}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', 
              color: 'var(--danger)', display: 'flex', alignItems: 'center'
            }}
            title="退出する"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* 失踪アラート表示 */}
      {lostAlert && (
        <div 
          className="animate-fade-in"
          style={{
            position: 'absolute', top: 80, left: 20, right: 20, zIndex: 1000,
            backgroundColor: 'var(--warning)', color: '#000', padding: '12px 16px',
            borderRadius: 'var(--radius-md)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.5)'
          }}
        >
          <AlertTriangle size={24} />
          <div>
            <div>リーダーから離れすぎています！</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>グループの方向へ戻ってください</div>
          </div>
        </div>
      )}

      {/* SOS全画面警告 */}
      {isSOS && (
        <div 
          style={{
            position: 'absolute', inset: 0, zIndex: 2000,
            backgroundColor: 'rgba(239, 68, 68, 0.9)', backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: 'white', animation: 'pulseGlow 2s infinite'
          }}
        >
          <PhoneCall size={64} style={{ marginBottom: '24px' }} className="animate-fade-in" />
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>SOS 発信中</h1>
          <p style={{ marginBottom: '32px', fontSize: '1.2rem' }}>グループ全員に緊急通知を送信しました</p>
          <button 
            className="btn" 
            style={{ backgroundColor: 'white', color: 'var(--danger)', fontSize: '1.2rem', padding: '12px 32px' }}
            onClick={() => setIsSOS(false)}
          >
            SOS をキャンセル
          </button>
        </div>
      )}

      {/* マップ本体 */}
      <LiveMap />

      {/* SOSボタン（右下） */}
      <button 
        className="btn"
        style={{
          position: 'absolute', bottom: 'calc(40px + env(safe-area-inset-bottom))', right: 20, zIndex: 1000,
          backgroundColor: 'var(--danger)', color: 'white',
          width: '60px', height: '60px', borderRadius: '50%',
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        onClick={() => setIsSOS(true)}
      >
        <AlertTriangle size={32} />
      </button>

      {/* 自分の位置にフォーカスするボタン等の拡張領域 */}
      <button 
        className="glass-panel"
        style={{
          position: 'absolute', bottom: 'calc(40px + env(safe-area-inset-bottom))', left: 20, zIndex: 1000,
          width: '50px', height: '50px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--surface-border)', cursor: 'pointer', color: 'var(--primary)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
        }}
        onClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
              updateMemberLocation(currentUser.id, pos.coords.latitude, pos.coords.longitude);
            });
          }
        }}
      >
        <MapPin size={24} />
      </button>
    </div>
  );
}
