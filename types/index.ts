export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  name: string;
  description?: string;
  pin: string; // 6位數字 PIN 碼
  ownerId: string; // 活動擁有者 ID
  createdAt: string;
  deleted?: boolean; // 是否已移除（隱藏）
}

export interface Participant {
  id: string;
  name: string;
  activityId: string;
}

export interface ScoreRecord {
  id: string;
  participantId: string;
  activityId: string;
  points: number;
  reason: string;
  createdAt: string;
}

export interface ParticipantWithScore extends Participant {
  totalScore: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  activityId: string;
  joinedAt: string;
}

