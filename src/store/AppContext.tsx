import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AppState, User, Group } from '../types';
import { supabase } from '../utils/supabaseClient';

interface AppContextType extends AppState {
  setCurrentUser: (user: User | null) => void;
  setCurrentGroup: (group: Group | null) => void;
  setGroupMembers: (members: User[]) => void;
  fetchGroupMembers: (groupId: string) => Promise<void>;
  updateMemberLocation: (userId: string, lat: number, lng: number) => void;
  leaveGroup: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);

  // DBから最新メンバー一覧を取得
  const fetchGroupMembers = async (groupId: string) => {
    const { data, error } = await supabase
      .from('user_locations')
      .select('*')
      .eq('group_id', groupId);
      
    if (error) {
      console.error('Error fetching members:', error);
      return;
    }
    
    if (data) {
      // DBのsnake_caseからキャメルケースに変換
      const members: User[] = data.map((d: any) => ({
        id: d.id,
        groupId: d.group_id,
        name: d.name,
        iconUrl: d.icon_url,
        currentLat: d.current_lat,
        currentLng: d.current_lng,
        lastUpdated: d.last_updated
      }));
      setGroupMembers(members);
    }
  };

  // 自分のロケーション更新用 (DB反映のみ、取得はSubscribeで行う)
  const updateMemberLocation = async (userId: string, lat: number, lng: number) => {
    // ローカルも一応更新しておく (即時反映のため)
    setGroupMembers((prev) =>
      prev.map((member) =>
        member.id === userId
          ? { ...member, currentLat: lat, currentLng: lng, lastUpdated: new Date().toISOString() }
          : member
      )
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => 
        prev ? { ...prev, currentLat: lat, currentLng: lng, lastUpdated: new Date().toISOString() } : null
      );
    }

    // DB 更新
    if (currentGroup) {
      await supabase
        .from('user_locations')
        .update({
          current_lat: lat,
          current_lng: lng,
          last_updated: new Date().toISOString()
        })
        .eq('id', userId);
    }
  };

  const leaveGroup = () => {
    setCurrentUser(null);
    setCurrentGroup(null);
    setGroupMembers([]);
  };

  // Realtime Subscription
  useEffect(() => {
    if (!currentGroup) return;

    const channel = supabase
      .channel(`group_${currentGroup.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_locations',
          filter: `group_id=eq.${currentGroup.id}`
        },
        () => {
          // 誰かの位置が変わったら一覧を取り直す
          fetchGroupMembers(currentGroup.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentGroup]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentGroup,
        groupMembers,
        setCurrentUser,
        setCurrentGroup,
        setGroupMembers,
        fetchGroupMembers,
        updateMemberLocation,
        leaveGroup
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
