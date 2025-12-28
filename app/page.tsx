'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChange, getCurrentAuthUser, logoutUser, getUserData } from '@/lib/firebase-auth';
import { getUserActivities, createActivity, updateActivity, getActivityByPin, hideActivity, joinActivity, restoreActivity } from '@/lib/firebase-db';
import { Activity, User } from '@/types';
import { ThemeToggle } from '@/components/ThemeToggle';

// 強制動態渲染，因為需要認證檢查
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editActivityName, setEditActivityName] = useState('');
  const [editActivityDesc, setEditActivityDesc] = useState('');
  const [activityError, setActivityError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }
      
      // 取得使用者資料
      const userData = await getUserData(firebaseUser.uid);
      if (userData) {
        setUser(userData);
        // 載入該使用者的活動列表（包括擁有的和加入的）
        const userActivities = await getUserActivities(firebaseUser.uid);
        setActivities(userActivities);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  const loadActivities = async () => {
    if (user) {
      const userActivities = await getUserActivities(user.id);
      setActivities(userActivities);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivityError('');
    if (newActivityName.trim() && user) {
      const result = await createActivity(newActivityName.trim(), newActivityDesc.trim() || undefined, user.id);
      if (result === null) {
        setActivityError('已存在相同名稱和描述的活動');
        return;
      }
      await loadActivities();
      setNewActivityName('');
      setNewActivityDesc('');
      setShowModal(false);
    }
  };

  const handleJoinActivityByPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    
    if (!pinCode.trim() || pinCode.trim().length !== 6) {
      setPinError('PIN 碼必須為 6 位數字');
      return;
    }

    if (!user) {
      setPinError('請先登入');
      return;
    }

    const activity = await getActivityByPin(pinCode.trim());
    if (!activity) {
      setPinError('找不到此 PIN 碼對應的活動');
      return;
    }

    // 如果活動已被移除，但用戶是活動的擁有者，則恢復活動
    if (activity.deleted && activity.ownerId === user.id) {
      const restoreSuccess = await restoreActivity(activity.id, user.id);
      if (!restoreSuccess) {
        setPinError('恢復活動失敗，請稍後再試');
        return;
      }
    } else if (activity.deleted) {
      // 如果活動已被移除且用戶不是擁有者，則拒絕
      setPinError('此活動已被移除');
      return;
    }

    // 建立用戶與活動的關聯
    const success = await joinActivity(user.id, activity.id);
    if (success) {
      // 重新載入活動列表
      await loadActivities();
      // 關閉 Modal
      setShowPinModal(false);
      setPinCode('');
      // 導向活動頁面
      router.push(`/activity/${activity.id}`);
    } else {
      setPinError('加入活動失敗，請稍後再試');
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setEditActivityName(activity.name);
    setEditActivityDesc(activity.description || '');
  };

  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivityError('');
    if (editingActivity && editActivityName.trim() && user) {
      const result = await updateActivity(editingActivity.id, editActivityName.trim(), editActivityDesc.trim() || undefined, user.id);
      if (result === null) {
        setActivityError('已存在相同名稱和描述的活動');
        return;
      }
      await loadActivities();
      setEditingActivity(null);
      setEditActivityName('');
      setEditActivityDesc('');
    }
  };

  const handleHideActivity = async (activityId: string) => {
    if (!user) return;
    
    if (confirm('確定要移除這個活動嗎？活動將從列表中隱藏，但資料不會被刪除。')) {
      const success = await hideActivity(activityId, user.id);
      if (success) {
        await loadActivities();
      }
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">活動計分管理系統</h1>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <span className="text-gray-600 dark:text-gray-300">歡迎，{user.username}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">活動列表</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPinModal(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium"
            >
              🔑 輸入 PIN 碼加入活動
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
            >
              + 新增活動
            </button>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">尚無活動，請新增第一個活動</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex justify-between items-start mb-2">
                  <Link
                    href={`/activity/${activity.id}`}
                    className="flex-1"
                  >
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">{activity.name}</h3>
                    {activity.description && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{activity.description}</p>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        建立時間：{new Date(activity.createdAt).toLocaleDateString('zh-TW')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        PIN 碼：{activity.pin}
                      </p>
                    </div>
                  </Link>
                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleEditActivity(activity);
                      }}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      編輯
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleHideActivity(activity.id);
                      }}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      移除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">新增活動</h3>
            {activityError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                {activityError}
              </div>
            )}
            <form onSubmit={handleCreateActivity} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  活動名稱 *
                </label>
                <input
                  id="name"
                  type="text"
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入活動名稱"
                />
              </div>
              <div>
                <label htmlFor="desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  活動說明
                </label>
                <textarea
                  id="desc"
                  value={newActivityDesc}
                  onChange={(e) => setNewActivityDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入活動說明（選填）"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setNewActivityName('');
                    setNewActivityDesc('');
                    setActivityError('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  建立
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 輸入 PIN 碼 Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">輸入 PIN 碼加入活動</h3>
            {pinError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                {pinError}
              </div>
            )}
            <form onSubmit={handleJoinActivityByPin} className="space-y-4">
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  PIN 碼（6 位數字）*
                </label>
                <input
                  id="pin"
                  type="text"
                  value={pinCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPinCode(value);
                    setPinError('');
                  }}
                  required
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                  placeholder="000000"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  請輸入活動的 6 位數字 PIN 碼以加入該活動
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinCode('');
                    setPinError('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  加入活動
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 編輯活動 Modal */}
      {editingActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">編輯活動</h3>
            {activityError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                {activityError}
              </div>
            )}
            <form onSubmit={handleUpdateActivity} className="space-y-4">
              <div>
                <label htmlFor="editName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  活動名稱 *
                </label>
                <input
                  id="editName"
                  type="text"
                  value={editActivityName}
                  onChange={(e) => setEditActivityName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入活動名稱"
                />
              </div>
              <div>
                <label htmlFor="editDesc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  活動說明
                </label>
                <textarea
                  id="editDesc"
                  value={editActivityDesc}
                  onChange={(e) => setEditActivityDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入活動說明（選填）"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingActivity(null);
                    setEditActivityName('');
                    setEditActivityDesc('');
                    setActivityError('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

