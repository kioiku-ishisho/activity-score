'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChange, getUserData } from '@/lib/firebase-auth';
import {
  getParticipant,
  getActivity,
  getScoresByParticipant,
  getParticipantTotalScore,
  addScore,
  updateScore,
} from '@/lib/firebase-db';
import { Participant, Activity, ScoreRecord, User } from '@/types';
import { ThemeToggle } from '@/components/ThemeToggle';
import { formatDateTime } from '@/lib/utils';

export default function ParticipantPage() {
  const router = useRouter();
  const params = useParams();
  const participantId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddScoreModal, setShowAddScoreModal] = useState(false);
  const [showEditScoreModal, setShowEditScoreModal] = useState(false);
  const [editingScore, setEditingScore] = useState<ScoreRecord | null>(null);
  const [addScorePoints, setAddScorePoints] = useState('');
  const [addScoreReason, setAddScoreReason] = useState('');
  const [editScorePoints, setEditScorePoints] = useState('');
  const [editScoreReason, setEditScoreReason] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }
      
      const userData = await getUserData(firebaseUser.uid);
      if (userData) {
        setUser(userData);
        await loadParticipantData();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [participantId, router]);

  const loadParticipantData = async () => {
    const participantData = await getParticipant(participantId);
    if (!participantData) {
      router.push('/');
      return;
    }
    setParticipant(participantData);

    const activityData = await getActivity(participantData.activityId);
    setActivity(activityData);

    const scoresData = await getScoresByParticipant(participantId);
    setScores(scoresData);

    const total = await getParticipantTotalScore(participantId);
    setTotalScore(total);
  };

  const handleEditScore = (score: ScoreRecord) => {
    setEditingScore(score);
    setEditScorePoints(score.points.toString());
    setEditScoreReason(score.reason);
    setShowEditScoreModal(true);
  };

  const handleAddScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (participant && activity && addScorePoints && addScoreReason.trim()) {
      const points = parseInt(addScorePoints);
      if (!isNaN(points)) {
        await addScore(participant.id, activity.id, points, addScoreReason.trim());
        setAddScorePoints('');
        setAddScoreReason('');
        setShowAddScoreModal(false);
        await loadParticipantData();
      }
    }
  };

  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingScore && editScorePoints && editScoreReason.trim()) {
      const points = parseInt(editScorePoints);
      if (!isNaN(points)) {
        await updateScore(editingScore.id, points, editScoreReason.trim());
        setEditScorePoints('');
        setEditScoreReason('');
        setShowEditScoreModal(false);
        setEditingScore(null);
        await loadParticipantData();
      }
    }
  };

  if (loading || !user || !participant) {
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 py-3 sm:py-0 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Link
                href={activity ? `/activity/${activity.id}` : '/'}
                className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors whitespace-nowrap"
              >
                ← 返回活動
              </Link>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 truncate flex-1 sm:flex-none">{participant.name}</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <ThemeToggle />
              <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300 truncate max-w-[120px] sm:max-w-none">{user.username}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{participant.name}</h2>
              {activity && (
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                  活動：<Link href={`/activity/${activity.id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                    {activity.name}
                  </Link>
                </p>
              )}
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">總分</p>
              <p
                className={`text-3xl sm:text-4xl font-bold ${
                  totalScore >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {totalScore > 0 ? '+' : ''}
                {totalScore}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">分數明細</h3>
          <button
            onClick={() => setShowAddScoreModal(true)}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium text-sm sm:text-base w-full sm:w-auto"
          >
            + 加減分
          </button>
        </div>

        {scores.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 sm:p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">尚無分數記錄</p>
          </div>
        ) : (
          <>
            {/* 桌面版表格 */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      分數
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      原因
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {scores.map((score) => (
                    <tr key={score.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(score.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-lg font-semibold ${
                            score.points >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {score.points > 0 ? '+' : ''}
                          {score.points}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{score.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditScore(score)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          編輯
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 手機版卡片 */}
            <div className="md:hidden space-y-4">
              {scores.map((score) => (
                <div key={score.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{formatDateTime(score.createdAt)}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{score.reason}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <span
                        className={`text-xl font-bold ${
                          score.points >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {score.points > 0 ? '+' : ''}
                        {score.points}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditScore(score)}
                    className="w-full mt-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                  >
                    編輯
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 加減分 Modal */}
        {showAddScoreModal && participant && activity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                為 {participant.name} 加減分
              </h3>
              <form onSubmit={handleAddScore} className="space-y-4">
                <div>
                  <label htmlFor="addPoints" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    分數 *
                  </label>
                  <input
                    id="addPoints"
                    type="number"
                    value={addScorePoints}
                    onChange={(e) => setAddScorePoints(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如：+10 或 -5"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">輸入正數為加分，負數為扣分</p>
                </div>
                <div>
                  <label htmlFor="addReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    原因 *
                  </label>
                  <textarea
                    id="addReason"
                    value={addScoreReason}
                    onChange={(e) => setAddScoreReason(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="請輸入加減分原因"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddScoreModal(false);
                      setAddScorePoints('');
                      setAddScoreReason('');
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    確認
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 編輯明細 Modal */}
        {showEditScoreModal && editingScore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">編輯分數記錄</h3>
              <form onSubmit={handleUpdateScore} className="space-y-4">
                <div>
                  <label htmlFor="editPoints" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    分數 *
                  </label>
                  <input
                    id="editPoints"
                    type="number"
                    value={editScorePoints}
                    onChange={(e) => setEditScorePoints(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如：+10 或 -5"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">輸入正數為加分，負數為扣分</p>
                </div>
                <div>
                  <label htmlFor="editReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    原因 *
                  </label>
                  <textarea
                    id="editReason"
                    value={editScoreReason}
                    onChange={(e) => setEditScoreReason(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="請輸入加減分原因"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditScoreModal(false);
                      setEditingScore(null);
                      setEditScorePoints('');
                      setEditScoreReason('');
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
      </main>
    </div>
  );
}

