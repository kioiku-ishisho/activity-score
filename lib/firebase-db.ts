import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, generatePin } from './firebase';
import { Activity, Participant, ScoreRecord } from '@/types';

// 將 Firestore Timestamp 轉換為 ISO 字串
function timestampToISO(timestamp: any): string {
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  return timestamp || new Date().toISOString();
}

// 活動相關
export async function createActivity(name: string, description: string | undefined, ownerId: string): Promise<Activity | null> {
  try {
    // 檢查是否已存在相同名稱和描述的活動（同一擁有者）
    const activitiesRef = collection(db, 'activities');
    const q = query(
      activitiesRef,
      where('ownerId', '==', ownerId),
      where('name', '==', name.trim()),
      where('description', '==', description?.trim() || '')
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return null; // 重複
    }

    // 生成唯一的 PIN 碼
    let pin: string;
    let pinExists = true;
    while (pinExists) {
      pin = generatePin();
      const pinQuery = query(activitiesRef, where('pin', '==', pin));
      const pinSnapshot = await getDocs(pinQuery);
      pinExists = !pinSnapshot.empty;
    }

    const newActivity: Omit<Activity, 'id' | 'createdAt'> & { createdAt: any } = {
      name: name.trim(),
      description: description?.trim() || undefined,
      pin: pin!,
      ownerId,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'activities'), newActivity);
    
    return {
      id: docRef.id,
      name: newActivity.name,
      description: newActivity.description,
      pin: newActivity.pin,
      ownerId: newActivity.ownerId,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('建立活動失敗:', error);
    return null;
  }
}

export async function getActivity(id: string): Promise<Activity | null> {
  try {
    const docRef = doc(db, 'activities', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: timestampToISO(data.createdAt),
      } as Activity;
    }
    return null;
  } catch (error) {
    console.error('取得活動失敗:', error);
    return null;
  }
}

export async function getActivityByPin(pin: string): Promise<Activity | null> {
  try {
    const activitiesRef = collection(db, 'activities');
    const q = query(activitiesRef, where('pin', '==', pin));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToISO(data.createdAt),
      } as Activity;
    }
    return null;
  } catch (error) {
    console.error('透過 PIN 取得活動失敗:', error);
    return null;
  }
}

export async function getActivitiesByOwner(ownerId: string): Promise<Activity[]> {
  try {
    const activitiesRef = collection(db, 'activities');
    const q = query(
      activitiesRef,
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToISO(data.createdAt),
      } as Activity;
    });
  } catch (error) {
    console.error('取得活動列表失敗:', error);
    return [];
  }
}

export async function updateActivity(id: string, name: string, description: string | undefined, ownerId: string): Promise<Activity | null> {
  try {
    const activity = await getActivity(id);
    if (!activity || activity.ownerId !== ownerId) {
      return null;
    }

    // 檢查是否已存在相同名稱和描述的活動（排除自己）
    const activitiesRef = collection(db, 'activities');
    const q = query(
      activitiesRef,
      where('ownerId', '==', ownerId),
      where('name', '==', name.trim()),
      where('description', '==', description?.trim() || '')
    );
    const snapshot = await getDocs(q);
    
    const duplicate = snapshot.docs.find(d => d.id !== id);
    if (duplicate) {
      return null; // 重複
    }

    await updateDoc(doc(db, 'activities', id), {
      name: name.trim(),
      description: description?.trim() || undefined,
    });

    return await getActivity(id);
  } catch (error) {
    console.error('更新活動失敗:', error);
    return null;
  }
}

// 參加者相關
export async function createParticipant(name: string, activityId: string): Promise<Participant | null> {
  try {
    // 檢查同一活動中是否已存在相同姓名的參加者
    const participantsRef = collection(db, 'participants');
    const q = query(
      participantsRef,
      where('activityId', '==', activityId),
      where('name', '==', name.trim())
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return null; // 重複
    }

    const newParticipant: Omit<Participant, 'id'> = {
      name: name.trim(),
      activityId,
    };

    const docRef = await addDoc(collection(db, 'participants'), newParticipant);
    
    return {
      id: docRef.id,
      ...newParticipant,
    };
  } catch (error) {
    console.error('建立參加者失敗:', error);
    return null;
  }
}

export async function createParticipantsBatch(names: string[], activityId: string): Promise<Participant[]> {
  try {
    const participantsRef = collection(db, 'participants');
    
    // 取得該活動中已存在的參加者姓名
    const existingQuery = query(participantsRef, where('activityId', '==', activityId));
    const existingSnapshot = await getDocs(existingQuery);
    const existingNames = new Set(
      existingSnapshot.docs.map(d => d.data().name.trim().toLowerCase())
    );

    const newParticipants: Participant[] = [];
    const batchNames = new Set<string>();

    for (const name of names) {
      const trimmedName = name.trim();
      if (!trimmedName) continue;

      const nameLower = trimmedName.toLowerCase();
      // 檢查是否重複（在現有參加者中，或在此次批量匯入中）
      if (existingNames.has(nameLower) || batchNames.has(nameLower)) {
        continue;
      }

      const docRef = await addDoc(participantsRef, {
        name: trimmedName,
        activityId,
      });

      newParticipants.push({
        id: docRef.id,
        name: trimmedName,
        activityId,
      });

      batchNames.add(nameLower);
    }

    return newParticipants;
  } catch (error) {
    console.error('批量建立參加者失敗:', error);
    return [];
  }
}

export async function getParticipantsByActivity(activityId: string): Promise<Participant[]> {
  try {
    const participantsRef = collection(db, 'participants');
    const q = query(participantsRef, where('activityId', '==', activityId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Participant));
  } catch (error) {
    console.error('取得參加者列表失敗:', error);
    return [];
  }
}

export async function getParticipant(id: string): Promise<Participant | null> {
  try {
    const docRef = doc(db, 'participants', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Participant;
    }
    return null;
  } catch (error) {
    console.error('取得參加者失敗:', error);
    return null;
  }
}

export async function updateParticipant(id: string, name: string): Promise<Participant | null> {
  try {
    const participant = await getParticipant(id);
    if (!participant) {
      return null;
    }

    // 檢查同一活動中是否已存在相同姓名的參加者（排除自己）
    const participantsRef = collection(db, 'participants');
    const q = query(
      participantsRef,
      where('activityId', '==', participant.activityId),
      where('name', '==', name.trim())
    );
    const snapshot = await getDocs(q);
    
    const duplicate = snapshot.docs.find(d => d.id !== id);
    if (duplicate) {
      return null; // 重複
    }

    await updateDoc(doc(db, 'participants', id), {
      name: name.trim(),
    });

    return await getParticipant(id);
  } catch (error) {
    console.error('更新參加者失敗:', error);
    return null;
  }
}

export async function deleteParticipant(id: string): Promise<boolean> {
  try {
    // 刪除該參加者的所有分數記錄
    const scoresRef = collection(db, 'scores');
    const q = query(scoresRef, where('participantId', '==', id));
    const scoresSnapshot = await getDocs(q);
    
    const deletePromises = scoresSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // 刪除參加者
    await deleteDoc(doc(db, 'participants', id));
    return true;
  } catch (error) {
    console.error('刪除參加者失敗:', error);
    return false;
  }
}

// 分數相關
export async function addScore(participantId: string, activityId: string, points: number, reason: string): Promise<ScoreRecord | null> {
  try {
    const newScore: Omit<ScoreRecord, 'id' | 'createdAt'> & { createdAt: any } = {
      participantId,
      activityId,
      points,
      reason: reason.trim(),
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'scores'), newScore);
    
    return {
      id: docRef.id,
      participantId,
      activityId,
      points,
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('新增分數失敗:', error);
    return null;
  }
}

export async function getScoresByParticipant(participantId: string): Promise<ScoreRecord[]> {
  try {
    const scoresRef = collection(db, 'scores');
    const q = query(
      scoresRef,
      where('participantId', '==', participantId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToISO(data.createdAt),
      } as ScoreRecord;
    });
  } catch (error) {
    console.error('取得分數記錄失敗:', error);
    return [];
  }
}

export async function getScoresByActivity(activityId: string): Promise<ScoreRecord[]> {
  try {
    const scoresRef = collection(db, 'scores');
    const q = query(scoresRef, where('activityId', '==', activityId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToISO(data.createdAt),
      } as ScoreRecord;
    });
  } catch (error) {
    console.error('取得活動分數記錄失敗:', error);
    return [];
  }
}

export async function updateScore(id: string, points: number, reason: string): Promise<ScoreRecord | null> {
  try {
    await updateDoc(doc(db, 'scores', id), {
      points,
      reason: reason.trim(),
    });

    const docRef = doc(db, 'scores', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: timestampToISO(data.createdAt),
      } as ScoreRecord;
    }
    return null;
  } catch (error) {
    console.error('更新分數失敗:', error);
    return null;
  }
}

export async function getParticipantTotalScore(participantId: string): Promise<number> {
  try {
    const scores = await getScoresByParticipant(participantId);
    return scores.reduce((total, score) => total + score.points, 0);
  } catch (error) {
    console.error('計算總分失敗:', error);
    return 0;
  }
}

