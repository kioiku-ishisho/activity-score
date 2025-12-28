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
import { Activity, Participant, ScoreRecord, UserActivity } from '@/types';

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
    const trimmedDescription = description?.trim();
    const hasDescription = !!trimmedDescription;
    
    // 如果 description 為空，查詢沒有 description 欄位的文檔；否則查詢 description 欄位等於該值的文檔
    let q;
    if (hasDescription) {
      q = query(
        activitiesRef,
        where('ownerId', '==', ownerId),
        where('name', '==', name.trim()),
        where('description', '==', trimmedDescription)
      );
    } else {
      // 查詢沒有 description 欄位或 description 為 null 的文檔
      // 注意：Firestore 無法直接查詢「欄位不存在」，所以我們先查詢所有同名活動，然後在記憶體中過濾
      q = query(
        activitiesRef,
        where('ownerId', '==', ownerId),
        where('name', '==', name.trim())
      );
    }
    
    const snapshot = await getDocs(q);
    
    // 如果 description 為空，需要在記憶體中過濾掉有 description 的結果
    let filteredSnapshot = snapshot;
    if (!hasDescription) {
      const filteredDocs = snapshot.docs.filter(doc => {
        const data = doc.data();
        return !data.description || data.description === '' || data.description === null;
      });
      filteredSnapshot = { ...snapshot, docs: filteredDocs, empty: filteredDocs.length === 0, size: filteredDocs.length } as any;
    }
    
    if (!filteredSnapshot.empty) {
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

    // 處理 description：如果為空則完全省略該欄位（Firestore 不支援 undefined）
    const activityData: any = {
      name: name.trim(),
      pin: pin!,
      ownerId,
      deleted: false,
      createdAt: serverTimestamp(),
    };
    
    // 只有在 description 有值時才添加該欄位
    if (trimmedDescription) {
      activityData.description = trimmedDescription;
    }
    
    const newActivity = activityData;

    const docRef = await addDoc(collection(db, 'activities'), newActivity);
    
    return {
      id: docRef.id,
      name: newActivity.name,
      description: newActivity.description || undefined,
      pin: newActivity.pin,
      ownerId: newActivity.ownerId,
      deleted: false,
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
    // 移除 orderBy 以避免需要複合索引，改為在客戶端排序
    const q = query(
      activitiesRef,
      where('ownerId', '==', ownerId)
    );
    const snapshot = await getDocs(q);
    
    const result = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: timestampToISO(data.createdAt),
        } as Activity;
      })
      .filter(activity => !activity.deleted); // 過濾掉已移除的活動
    
    // 在客戶端按建立時間降序排序
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // 降序排序（最新的在前）
    });
    
    return result;
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

// 隱藏活動（標記為已移除，不實際刪除）
export async function hideActivity(id: string, ownerId: string): Promise<boolean> {
  try {
    const activity = await getActivity(id);
    if (!activity || activity.ownerId !== ownerId) {
      return false;
    }

    await updateDoc(doc(db, 'activities', id), {
      deleted: true,
    });

    return true;
  } catch (error) {
    console.error('隱藏活動失敗:', error);
    return false;
  }
}

// 恢復活動（取消已移除標記）
export async function restoreActivity(id: string, ownerId: string): Promise<boolean> {
  try {
    const activity = await getActivity(id);
    if (!activity || activity.ownerId !== ownerId) {
      return false;
    }

    await updateDoc(doc(db, 'activities', id), {
      deleted: false,
    });

    return true;
  } catch (error) {
    console.error('恢復活動失敗:', error);
    return false;
  }
}

// 用戶參與活動相關
// 加入活動（建立用戶與活動的關聯）
export async function joinActivity(userId: string, activityId: string): Promise<boolean> {
  try {
    // 檢查是否已經加入
    const userActivitiesRef = collection(db, 'userActivities');
    const q = query(
      userActivitiesRef,
      where('userId', '==', userId),
      where('activityId', '==', activityId)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return true; // 已經加入
    }

    // 建立關聯
    await addDoc(userActivitiesRef, {
      userId,
      activityId,
      joinedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('加入活動失敗:', error);
    return false;
  }
}

// 取得用戶參與的所有活動（包括擁有的和加入的）
export async function getUserActivities(userId: string): Promise<Activity[]> {
  try {
    // 取得用戶擁有的活動
    const ownedActivities = await getActivitiesByOwner(userId);
    
    // 取得用戶參與的活動 ID 列表
    const userActivitiesRef = collection(db, 'userActivities');
    const q = query(
      userActivitiesRef,
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    
    const joinedActivityIds = new Set(snapshot.docs.map(doc => doc.data().activityId));
    
    // 取得用戶加入的活動（排除已擁有的）
    const joinedActivities: Activity[] = [];
    for (const activityId of joinedActivityIds) {
      // 檢查是否已經在擁有的活動列表中
      if (!ownedActivities.find(a => a.id === activityId)) {
        const activity = await getActivity(activityId);
        if (activity && !activity.deleted) {
          joinedActivities.push(activity);
        }
      }
    }
    
    // 合併並排序
    const allActivities = [...ownedActivities, ...joinedActivities];
    allActivities.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // 降序排序（最新的在前）
    });
    
    return allActivities;
  } catch (error) {
    console.error('取得用戶活動列表失敗:', error);
    return [];
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
    // 移除 orderBy 以避免需要複合索引，改為在客戶端排序
    const q = query(
      scoresRef,
      where('participantId', '==', participantId)
    );
    const snapshot = await getDocs(q);
    
    const result = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToISO(data.createdAt),
      } as ScoreRecord;
    });
    
    // 在客戶端按建立時間降序排序
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // 降序排序（最新的在前）
    });
    
    return result;
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

