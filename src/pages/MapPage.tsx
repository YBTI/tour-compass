import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAppContext } from '../store/AppContext';
import LiveMap from '../components/LiveMap';
import { calculateDistance } from '../utils/mockData';
import { supabase } from '../utils/supabaseClient';
import { isPushSupported, subscribePush, sendCheerPush } from '../utils/pushNotification';
import { AlertTriangle, ShieldCheck, PhoneCall, MapPin, LogOut, Loader2, Megaphone, X, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MapPage() {
  const navigate = useNavigate();
  const { currentUser, currentGroup, groupMembers, updateMemberLocation, fetchGroupMembers, leaveGroup } = useAppContext();
  const [isSOS, setIsSOS] = useState(false);
  const [lostAlert, setLostAlert] = useState(false);
  const [isCheerPickerOpen, setIsCheerPickerOpen] = useState(false);
  const [cheerTargetIds, setCheerTargetIds] = useState<string[]>([]);
  const [cheerSentMessage, setCheerSentMessage] = useState<string | null>(null);
  const [cheerRequest, setCheerRequest] = useState<{ fromName: string } | null>(null);
  const cheerChannelRef = useRef<RealtimeChannel | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(
    isPushSupported() ? Notification.permission : null
  );

  // 通知が許可済みなら Push 購読を登録 (アプリを閉じていても応援通知を受け取るため)
  useEffect(() => {
    if (!currentUser || !currentGroup || pushPermission !== 'granted') return;
    subscribePush(currentUser.id, currentGroup.id);
  }, [currentUser?.id, currentGroup?.id, pushPermission]);

  // iOS ではユーザー操作起点でないと通知許可を求められないためボタンから呼ぶ
  const enablePush = async () => {
    if (!currentUser || !currentGroup) return;
    await subscribePush(currentUser.id, currentGroup.id);
    setPushPermission(Notification.permission);
  };

  // 応援通知チャンネル (Realtime Broadcast)
  useEffect(() => {
    if (!currentGroup || !currentUser) return;
    const channel = supabase
      .channel(`cheer_${currentGroup.id}`)
      .on('broadcast', { event: 'cheer' }, ({ payload }) => {
        if (!payload?.toIds?.includes(currentUser.id)) return;
        setCheerRequest({ fromName: payload.fromName });
        if ('vibrate' in navigator) navigator.vibrate([300, 100, 300]);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('応援要請', { body: `${payload.fromName}さんが応援を求めています` });
        }
      })
      .subscribe();
    cheerChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      cheerChannelRef.current = null;
    };
  }, [currentGroup?.id, currentUser?.id]);

  const sendCheer = async () => {
    if (!currentUser || !cheerChannelRef.current || cheerTargetIds.length === 0) return;
    await cheerChannelRef.current.send({
      type: 'broadcast',
      event: 'cheer',
      payload: { fromId: currentUser.id, fromName: currentUser.name, toIds: cheerTargetIds }
    });
    // アプリを閉じているメンバー向けの Push 通知
    if (currentGroup) sendCheerPush(currentGroup.id, currentUser.name, cheerTargetIds);
    setCheerSentMessage(`${cheerTargetIds.length}人に応援通知を送信しました`);
    setTimeout(() => setCheerSentMessage(null), 3000);
    setIsCheerPickerOpen(false);
    setCheerTargetIds([]);
  };

  const openCheerPicker = () => {
    // 通知の許可と Push 購読の登録
    if (pushPermission === 'default') enablePush();
    setIsCheerPickerOpen(true);
  };

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
          {pushPermission === 'default' && (
            <button
              onClick={enablePush}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--primary)', display: 'flex', alignItems: 'center'
              }}
              title="応援通知をオンにする"
            >
              <Bell size={18} />
            </button>
          )}
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

      {/* 応援要請の受信表示 */}
      {cheerRequest && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute', top: lostAlert ? 150 : 80, left: 20, right: 20, zIndex: 1500,
            backgroundColor: 'var(--primary)', color: 'white', padding: '12px 16px',
            borderRadius: 'var(--radius-md)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}
        >
          <Megaphone size={24} />
          <div style={{ flex: 1 }}>
            <div>応援要請が届きました！</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>{cheerRequest.fromName}さんが応援を求めています</div>
          </div>
          <button
            onClick={() => setCheerRequest(null)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}
            title="閉じる"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* 応援通知の送信完了表示 */}
      {cheerSentMessage && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute', bottom: 'calc(190px + env(safe-area-inset-bottom))', left: 20, right: 20, zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.75)', color: 'white', padding: '10px 16px',
            borderRadius: 'var(--radius-md)', textAlign: 'center'
          }}
        >
          {cheerSentMessage}
        </div>
      )}

      {/* 応援相手の選択 */}
      {isCheerPickerOpen && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 1800, backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
          }}
          onClick={() => setIsCheerPickerOpen(false)}
        >
          <div
            className="animate-fade-in"
            style={{
              width: '100%', maxWidth: '480px', backgroundColor: 'white', color: 'var(--text-main)',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', padding: '20px',
              paddingBottom: 'calc(20px + env(safe-area-inset-bottom))'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={20} color="var(--primary)" /> 応援に来てほしい人を選択
            </h2>
            <div style={{ maxHeight: '40vh', overflowY: 'auto', marginBottom: '16px' }}>
              {groupMembers.filter(m => m.id !== currentUser.id).length === 0 && (
                <p style={{ color: 'var(--text-muted)' }}>他のメンバーがいません</p>
              )}
              {groupMembers.filter(m => m.id !== currentUser.id).map(m => (
                <label
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 4px',
                    borderBottom: '1px solid var(--surface-border)', cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={cheerTargetIds.includes(m.id)}
                    onChange={(e) =>
                      setCheerTargetIds(prev => e.target.checked ? [...prev, m.id] : prev.filter(id => id !== m.id))
                    }
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span>{m.name}{m.id === currentGroup.leaderId && '（リーダー）'}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsCheerPickerOpen(false)}>
                キャンセル
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, opacity: cheerTargetIds.length === 0 ? 0.5 : 1 }}
                disabled={cheerTargetIds.length === 0}
                onClick={sendCheer}
              >
                応援を呼ぶ
              </button>
            </div>
          </div>
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

      {/* 応援ボタン（SOSボタンの上） */}
      <button
        className="btn"
        style={{
          position: 'absolute', bottom: 'calc(115px + env(safe-area-inset-bottom))', right: 20, zIndex: 1000,
          backgroundColor: 'var(--primary)', color: 'white',
          width: '60px', height: '60px', borderRadius: '50%',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        onClick={openCheerPicker}
        title="応援を呼ぶ"
      >
        <Megaphone size={28} />
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
