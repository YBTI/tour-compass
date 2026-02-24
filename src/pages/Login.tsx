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
    
    // Create current user
    const newUser: User = {
      id: generateId(),
      groupId: '', // 後でセットされます
      name: name.trim(),
      iconUrl: avatar,
      currentLat: 35.681236, // default Tokyo Start
      currentLng: 139.767125,
      lastUpdated: new Date().toISOString()
    };

    let targetGroup: Group;

    if (mode === 'create') {
      const newGroupId = generateId();
      targetGroup = {
        id: newGroupId,
        leaderId: newUser.id,
        alertDistance: 100 // default 100m
      };

      // Create Group in Supabase
      const { error: groupError } = await supabase
        .from('groups')
        .insert({
          id: targetGroup.id,
          leader_id: targetGroup.leaderId,
          alert_distance: targetGroup.alertDistance
        });

      if (groupError) {
        setIsLoading(false);
        return alert('グループの作成に失敗しました: ' + groupError.message);
      }
      newUser.groupId = targetGroup.id;
    } else {
      if (!groupId.trim()) {
        setIsLoading(false);
        return alert('グループIDを入力してください');
      }
      
      const searchId = groupId.trim().toUpperCase();
      
      // Check if group exists in Supabase
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

    if (userError) {
      setIsLoading(false);
      return alert('ユーザー情報の登録に失敗しました: ' + userError.message);
    }

    setCurrentUser(newUser);
    setCurrentGroup(targetGroup);
    
    navigate('/map');
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
