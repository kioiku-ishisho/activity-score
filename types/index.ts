export interface User {
  id: string;
  username: string;
  password: string;
}

export interface Activity {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
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

