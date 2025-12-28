'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, logout, getActivities, createActivity, updateActivity } from '@/lib/storage';
import { Activity } from '@/types';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editActivityName, setEditActivityName] = useState('');
  const [editActivityDesc, setEditActivityDesc] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    setActivities(getActivities());
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (newActivityName.trim()) {
      createActivity(newActivityName.trim(), newActivityDesc.trim());
      setActivities(getActivities());
      setNewActivityName('');
      setNewActivityDesc('');
      setShowModal(false);
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setEditActivityName(activity.name);
    setEditActivityDesc(activity.description || '');
  };

  const handleUpdateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingActivity && editActivityName.trim()) {
      updateActivity(editingActivity.id, editActivityName.trim(), editActivityDesc.trim());
      setActivities(getActivities());
      setEditingActivity(null);
      setEditActivityName('');
      setEditActivityDesc('');
    }
  };

  if (!user) {
    return null;
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
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
          >
            + 新增活動
          </button>
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
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      建立時間：{new Date(activity.createdAt).toLocaleDateString('zh-TW')}
                    </p>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleEditActivity(activity);
                    }}
                    className="ml-4 px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    編輯
                  </button>
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

      {/* 編輯活動 Modal */}
      {editingActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">編輯活動</h3>
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

