import { Activity, Participant, ScoreRecord, User } from '@/types';

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
    const defaultUsers: User[] = [
      { id: '1', username: 'admin', password: 'admin123' }
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
  const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
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

// 活動相關
export function getActivities(): Activity[] {
  initStorage();
  const activities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]');
  return activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createActivity(name: string, description?: string): Activity {
  initStorage();
  const activities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]');
  const newActivity: Activity = {
    id: Date.now().toString(),
    name,
    description,
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

export function createParticipant(name: string, activityId: string): Participant {
  initStorage();
  const participants: Participant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PARTICIPANTS) || '[]');
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
  
  names.forEach((name, index) => {
    if (name.trim()) {
      const newParticipant: Participant = {
        id: (baseTime + index).toString(),
        name: name.trim(),
        activityId,
      };
      participants.push(newParticipant);
      newParticipants.push(newParticipant);
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

