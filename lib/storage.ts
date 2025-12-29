import { Activity, Participant, ScoreRecord, User } from '@/types';

// 內部類型：用於 localStorage 的用戶類型（包含密碼）
interface LocalStorageUser extends User {
  password: string;
}

const STORAGE_KEYS = {
  USERS: 'users',
  ACTIVITIES: 'activities',
  PARTICIPANTS: 'participants',
  SCORES: 'scores',
  CURRENT_USER: 'currentUser',
} as const;

// 初始化數據
function initStorage() {
  if (typeof window === 'undefined') return;

  // 初始化用戶（預設用戶）
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultUsers: LocalStorageUser[] = [
      { id: '1', username: 'admin', userCode: '000000', password: 'admin123', createdAt: new Date().toISOString() }
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
  }

  // 初始化其他數據
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PARTICIPANTS)) {
    localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SCORES)) {
    localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify([]));
  }
}

// 用戶相關
export function login(username: string, password: string): User | null {
  initStorage();
  const users: LocalStorageUser[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    // 移除密碼後返回用戶
    const { password: _, ...userWithoutPassword } = user;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userWithoutPassword));
    return userWithoutPassword;
  }
  return null;
}

export function logout() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return userStr ? JSON.parse(userStr) : null;
}

// 生成 6 位數字 PIN 碼（簡單版本，用於 localStorage）
function generateSimplePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 活動相關
export function getActivities(): Activity[] {
  initStorage();
  const activities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]');
  return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createActivity(name: string, description?: string, ownerId: string = '1'): Activity | null {
  initStorage();
  const activities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]');
  
  // 檢查是否已存在相同名稱和描述的活動
  const exists = activities.some(a => 
    a.name.trim() === name.trim() && 
    (a.description || '').trim() === (description || '').trim()
  );
  
  if (exists) {
    return null; // 返回 null 表示重複
  }
  
  const newActivity: Activity = {
    id: Date.now().toString(),
    name,
    description,
    pin: generateSimplePin(),
    ownerId,
    createdAt: new Date().toISOString(),
  };
  activities.push(newActivity);
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  return newActivity;
}

export function getActivity(id: string): Activity | null {
  initStorage();
  const activities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]');
  return activities.find(a => a.id === id) || null;
}

// 參加者相關
export function getParticipantsByActivity(activityId: string): Participant[] {
  initStorage();
  const participants: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PARTICIPANTS) || '[]');
  return participants.filter(p => p.activityId === activityId);
}

export function createParticipant(name: string, activityId: string): Participant | null {
  initStorage();
  const participants: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PARTICIPANTS) || '[]');
  
  // 檢查同一活動中是否已存在相同姓名的參加者
  const exists = participants.some(p => 
    p.activityId === activityId && 
    p.name.trim() === name.trim()
  );
  
  if (exists) {
    return null; // 返回 null 表示重複
  }
  
  const newParticipant: Participant = {
    id: Date.now().toString(),
    name,
    activityId,
  };
  participants.push(newParticipant);
  localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
  return newParticipant;
}

export function createParticipantsBatch(names: string[], activityId: string): Participant[] {
  initStorage();
  const participants: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PARTICIPANTS) || '[]');
  const newParticipants: Participant[] = [];
  const baseTime = Date.now();
  
  // 取得該活動中已存在的參加者姓名
  const existingNames = new Set(
    participants
      .filter(p => p.activityId === activityId)
      .map(p => p.name.trim().toLowerCase())
  );
  
  names.forEach((name, index) => {
    const trimmedName = name.trim();
    if (trimmedName) {
      // 檢查是否重複（在同一活動中，或在此次批量匯入中）
      const nameLower = trimmedName.toLowerCase();
      const isDuplicate = existingNames.has(nameLower) || 
        newParticipants.some(p => p.name.trim().toLowerCase() === nameLower);
      
      if (!isDuplicate) {
        const newParticipant: Participant = {
          id: (baseTime + index).toString(),
          name: trimmedName,
          activityId,
        };
        participants.push(newParticipant);
        newParticipants.push(newParticipant);
        existingNames.add(nameLower);
      }
    }
  });
  
  localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
  return newParticipants;
}

export function getParticipant(id: string): Participant | null {
  initStorage();
  const participants: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PARTICIPANTS) || '[]');
  return participants.find(p => p.id === id) || null;
}

export function deleteParticipant(id: string): boolean {
  initStorage();
  const participants: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PARTICIPANTS) || '[]');
  const index = participants.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  participants.splice(index, 1);
  localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
  
  // 同時刪除該參加者的所有分數記錄
  const scores: ScoreRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCORES) || '[]');
  const filteredScores = scores.filter(s => s.participantId !== id);
  localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(filteredScores));
  
  return true;
}

// 分數相關
export function getScoresByParticipant(participantId: string): ScoreRecord[] {
  initStorage();
  const scores: ScoreRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCORES) || '[]');
  return scores
    .filter(s => s.participantId === participantId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getScoresByActivity(activityId: string): ScoreRecord[] {
  initStorage();
  const scores: ScoreRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCORES) || '[]');
  return scores.filter(s => s.activityId === activityId);
}

export function addScore(participantId: string, activityId: string, points: number, reason: string): ScoreRecord {
  initStorage();
  const scores: ScoreRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCORES) || '[]');
  const newScore: ScoreRecord = {
    id: Date.now().toString(),
    participantId,
    activityId,
    points,
    reason,
    createdAt: new Date().toISOString(),
  };
  scores.push(newScore);
  localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
  return newScore;
}

export function getParticipantTotalScore(participantId: string): number {
  const scores = getScoresByParticipant(participantId);
  return scores.reduce((total, score) => total + score.points, 0);
}

// 編輯活動
export function updateActivity(id: string, name: string, description?: string): Activity | null {
  initStorage();
  const activities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]');
  const index = activities.findIndex(a => a.id === id);
  if (index === -1) return null;
  
  // 檢查是否已存在相同名稱和描述的活動（排除自己）
  const exists = activities.some(a => 
    a.id !== id &&
    a.name.trim() === name.trim() && 
    (a.description || '').trim() === (description || '').trim()
  );
  
  if (exists) {
    return null; // 返回 null 表示重複
  }
  
  activities[index] = {
    ...activities[index],
    name,
    description,
  };
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  return activities[index];
}

// 編輯參加者
export function updateParticipant(id: string, name: string): Participant | null {
  initStorage();
  const participants: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PARTICIPANTS) || '[]');
  const index = participants.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  const participant = participants[index];
  
  // 檢查同一活動中是否已存在相同姓名的參加者（排除自己）
  const exists = participants.some(p => 
    p.id !== id &&
    p.activityId === participant.activityId && 
    p.name.trim() === name.trim()
  );
  
  if (exists) {
    return null; // 返回 null 表示重複
  }
  
  participants[index] = {
    ...participants[index],
    name,
  };
  localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
  return participants[index];
}

// 編輯分數記錄
export function updateScore(id: string, points: number, reason: string): ScoreRecord | null {
  initStorage();
  const scores: ScoreRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCORES) || '[]');
  const index = scores.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  scores[index] = {
    ...scores[index],
    points,
    reason,
  };
  localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
  return scores[index];
}

