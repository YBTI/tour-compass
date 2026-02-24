import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, MapPin, Loader2 } from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import { supabase } from '../utils/supabaseClient';
import type { User, Group } from '../types';

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=John&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike&backgroundColor=c0aede'
];

export default function Login() {
  const navigate = useNavigate();
  const { setCurrentUser, setCurrentGroup } = useAppContext();
  
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [groupId, setGroupId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleJoinOrCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('名前を入力してください');
    
    setIsLoading(true);
    
    try {
      // 1. GPS情報を取得（タイムアウト付）
      let lat = 35.681236; // デフォルト：東京
      let lng = 139.767125;
      
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, // ログイン時は早さを優先
            timeout: 5000,
            maximumAge: 60000
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (gpsErr) {
        console.warn('GPS取得失敗。デフォルト位置を使用します。', gpsErr);
        // GPSが取れなくても継続（エラーにはしない）
      }

      // Create current user
      const newUser: User = {
        id: generateId(),
        groupId: '', // 後でセット
        name: name.trim(),
        iconUrl: avatar,
        currentLat: lat,
        currentLng: lng,
        lastUpdated: new Date().toISOString()
      };

      let targetGroup: Group;

      if (mode === 'create') {
        const newGroupId = generateId();
        targetGroup = {
          id: newGroupId,
          leaderId: newUser.id,
          alertDistance: 100
        };

        const { error: groupError } = await supabase
          .from('groups')
          .insert({
            id: targetGroup.id,
            leader_id: targetGroup.leaderId,
            alert_distance: targetGroup.alertDistance
          });

        if (groupError) throw groupError;
        newUser.groupId = targetGroup.id;
      } else {
        if (!groupId.trim()) {
          setIsLoading(false);
          return alert('グループIDを入力してください');
        }
        const searchId = groupId.trim().toUpperCase();
        const { data: existingGroup, error: findError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', searchId)
          .single();
          
        if (findError || !existingGroup) {
          setIsLoading(false);
          return alert('指定されたグループが見つかりません');
        }

        targetGroup = {
          id: existingGroup.id,
          leaderId: existingGroup.leader_id,
          alertDistance: existingGroup.alert_distance || 100
        };
        newUser.groupId = targetGroup.id;
      }

      // Upsert User Location
      const { error: userError } = await supabase
        .from('user_locations')
        .upsert({
          id: newUser.id,
          group_id: newUser.groupId,
          name: newUser.name,
          icon_url: newUser.iconUrl,
          current_lat: newUser.currentLat,
          current_lng: newUser.currentLng,
          last_updated: newUser.lastUpdated
        });

      if (userError) throw userError;

      // 重要：Stateの直接セット
      setCurrentUser(newUser);
      setCurrentGroup(targetGroup);
      
      // 成功ログ
      console.log('Login Success:', newUser.id);
      
      // 移動
      navigate('/map');
    } catch (err: any) {
      console.error('Login Error:', err);
      alert('エラーが発生しました: ' + (err.message || JSON.stringify(err)));
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel animate-fade-in" style={{
        background: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.5)'
      }}>
        <div className="login-header">
          <ShieldCheck size={56} color="var(--primary)" style={{ margin: '0 auto 16px', filter: 'drop-shadow(0 4px 6px rgba(79, 70, 229, 0.2))' }} />
          <h1>はぐれナイト</h1>
          <p>あなたを迷子から守る、心強い同行者。</p>
        </div>

        <form onSubmit={handleJoinOrCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>プロフィール</label>
            <div className="avatar-selector">
              {AVATARS.map((url, i) => (
                <img 
                  key={i}
                  src={url} 
                  alt={`Avatar ${i}`} 
                  className={`avatar-option ${avatar === url ? 'selected' : ''}`}
                  onClick={() => setAvatar(url)}
                />
              ))}
            </div>
            <input 
              type="text" 
              className="input-field" 
              placeholder="あなたの名前" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="divider"> または </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className={`btn ${mode === 'join' ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ flex: 1 }}
              onClick={() => setMode('join')}
            >
              参加する
            </button>
            <button 
              type="button" 
              className={`btn ${mode === 'create' ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ flex: 1 }}
              onClick={() => setMode('create')}
            >
              作成する
            </button>
          </div>

          {mode === 'join' && (
            <div className="form-group animate-fade-in" style={{ marginTop: '8px' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="グループIDを入力" 
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                maxLength={6}
                style={{ textTransform: 'uppercase' }}
                required
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginTop: '16px', width: '100%' }} disabled={isLoading}>
            {isLoading ? (
              <><Loader2 size={20} className="animate-spin" /> 処理中...</>
            ) : mode === 'join' ? (
              <><Users size={20} /> グループに参加</>
            ) : (
              <><MapPin size={20} /> 新しいグループを作成</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
