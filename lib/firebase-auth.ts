import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '@/types';

// 註冊新使用者
export async function registerUser(email: string, password: string, username: string): Promise<{ user: FirebaseUser | null; error: string | null }> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // 在 Firestore 中建立使用者資料
    const userData: User = {
      id: firebaseUser.uid,
      username,
      email,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      ...userData,
      createdAt: serverTimestamp(),
    });

    return { user: firebaseUser, error: null };
  } catch (error: any) {
    return { user: null, error: error.message || '註冊失敗' };
  }
}

// 登入使用者
export async function loginUser(email: string, password: string): Promise<{ user: FirebaseUser | null; error: string | null }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message || '登入失敗' };
  }
}

// 登出使用者
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// 取得當前使用者
export function getCurrentAuthUser(): FirebaseUser | null {
  return auth.currentUser;
}

// 監聽認證狀態變化
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// 從 Firestore 取得使用者資料
export async function getUserData(userId: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
    return null;
  } catch (error) {
    console.error('取得使用者資料失敗:', error);
    return null;
  }
}

