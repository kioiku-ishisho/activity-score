'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentUser,
  getActivity,
  getParticipantsByActivity,
  createParticipant,
  createParticipantsBatch,
  updateParticipant,
  deleteParticipant,
  getScoresByActivity,
  addScore,
  getParticipantTotalScore,
} from '@/lib/storage';
import { Activity, Participant, ParticipantWithScore } from '@/types';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function ActivityPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithScore[]>([]);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showEditParticipantModal, setShowEditParticipantModal] = useState(false);
  const [showBatchScoreModal, setShowBatchScoreModal] = useState(false);
  const [showDeleteParticipantModal, setShowDeleteParticipantModal] = useState(false);
  const [showImportCsvModal, setShowImportCsvModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [newParticipantName, setNewParticipantName] = useState('');
  const [editParticipantName, setEditParticipantName] = useState('');
  const [scorePoints, setScorePoints] = useState('');
  const [scoreReason, setScoreReason] = useState('');
  const [batchScorePoints, setBatchScorePoints] = useState('');
  const [batchScoreReason, setBatchScoreReason] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    loadActivityData();
  }, [activityId, router]);

  const loadActivityData = () => {
    const activityData = getActivity(activityId);
    if (!activityData) {
      router.push('/');
      return;
    }
    setActivity(activityData);

    const participantsData = getParticipantsByActivity(activityId);
    const participantsWithScores: ParticipantWithScore[] = participantsData.map((p) => ({
      ...p,
      totalScore: getParticipantTotalScore(p.id),
    }));
    setParticipants(participantsWithScores);
  };

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (newParticipantName.trim() && activityId) {
      createParticipant(newParticipantName.trim(), activityId);
      setNewParticipantName('');
      setShowAddParticipantModal(false);
      loadActivityData();
    }
  };

  const handleAddScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedParticipant && activityId && scorePoints && scoreReason.trim()) {
      const points = parseInt(scorePoints);
      if (!isNaN(points)) {
        addScore(selectedParticipant.id, activityId, points, scoreReason.trim());
        setScorePoints('');
        setScoreReason('');
        setShowScoreModal(false);
        setSelectedParticipant(null);
        loadActivityData();
      }
    }
  };

  const openScoreModal = (participant: Participant) => {
    setSelectedParticipant(participant);
    setShowScoreModal(true);
  };

  const handleEditParticipant = (participant: Participant) => {
    setEditingParticipant(participant);
    setEditParticipantName(participant.name);
    setShowEditParticipantModal(true);
  };

  const handleUpdateParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingParticipant && editParticipantName.trim()) {
      updateParticipant(editingParticipant.id, editParticipantName.trim());
      setEditParticipantName('');
      setShowEditParticipantModal(false);
      setEditingParticipant(null);
      loadActivityData();
    }
  };

  const handleToggleParticipant = (participantId: string) => {
    const newSelected = new Set(selectedParticipants);
    if (newSelected.has(participantId)) {
      newSelected.delete(participantId);
    } else {
      newSelected.add(participantId);
    }
    setSelectedParticipants(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedParticipants.size === participants.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(participants.map(p => p.id)));
    }
  };

  const handleBatchAddScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedParticipants.size > 0 && activityId && batchScorePoints && batchScoreReason.trim()) {
      const points = parseInt(batchScorePoints);
      if (!isNaN(points)) {
        selectedParticipants.forEach(participantId => {
          addScore(participantId, activityId, points, batchScoreReason.trim());
        });
        setBatchScorePoints('');
        setBatchScoreReason('');
        setSelectedParticipants(new Set());
        setShowBatchScoreModal(false);
        loadActivityData();
      }
    }
  };

  const openBatchScoreModal = () => {
    setSelectedParticipants(new Set());
    setBatchScorePoints('');
    setBatchScoreReason('');
    setShowBatchScoreModal(true);
  };

  const handleDeleteParticipant = (participant: Participant) => {
    setDeletingParticipant(participant);
    setShowDeleteParticipantModal(true);
  };

  const confirmDeleteParticipant = () => {
    if (deletingParticipant) {
      deleteParticipant(deletingParticipant.id);
      setShowDeleteParticipantModal(false);
      setDeletingParticipant(null);
      loadActivityData();
    }
  };

  const parseCSV = (csvText: string): string[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const names: string[] = [];
    
    lines.forEach((line, index) => {
      // 跳過標題行（第一行）
      if (index === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('姓名') || line.toLowerCase().includes('名稱'))) {
        return;
      }
      
      // 處理 CSV 行，支援引號包裹的值
      const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
      if (values.length > 0) {
        // 移除引號和空白
        const name = values[0].replace(/^["']|["']$/g, '').trim();
        if (name) {
          names.push(name);
        }
      }
    });
    
    return names;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 檢查檔案類型
    if (!file.name.endsWith('.csv')) {
      alert('請上傳 CSV 檔案');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const names = parseCSV(text);
        
        if (names.length === 0) {
          alert('CSV 檔案中沒有找到有效的參加者名稱');
          return;
        }

        // 批量創建參加者
        createParticipantsBatch(names, activityId);
        setShowImportCsvModal(false);
        loadActivityData();
        alert(`成功匯入 ${names.length} 位參加者`);
      } catch (error) {
        console.error('CSV 解析錯誤:', error);
        alert('CSV 檔案解析失敗，請檢查檔案格式');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  if (!user || !activity) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
              >
                ← 返回首頁
              </Link>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{activity.name}</h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <span className="text-gray-600 dark:text-gray-300">{user.username}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activity.description && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <p className="text-gray-700 dark:text-gray-300">{activity.description}</p>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">參加者列表</h2>
          <div className="flex gap-3">
            {participants.length > 0 && (
              <button
                onClick={openBatchScoreModal}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors font-medium"
              >
                📊 批量增減分
              </button>
            )}
            <button
              onClick={() => setShowImportCsvModal(true)}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors font-medium"
            >
              📥 CSV 匯入
            </button>
            <button
              onClick={() => setShowAddParticipantModal(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium"
            >
              + 新增參加者
            </button>
          </div>
        </div>

        {participants.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">尚無參加者，請新增第一個參加者</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    參加者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    總分
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {participants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/participant/${participant.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                      >
                        {participant.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-lg font-semibold ${
                          participant.totalScore >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {participant.totalScore > 0 ? '+' : ''}
                        {participant.totalScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditParticipant(participant)}
                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 mr-4"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => openScoreModal(participant)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-4"
                      >
                        加減分
                      </button>
                      <Link
                        href={`/participant/${participant.id}`}
                        className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 mr-4"
                      >
                        查看明細
                      </Link>
                      <button
                        onClick={() => handleDeleteParticipant(participant)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* 新增參加者 Modal */}
      {showAddParticipantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">新增參加者</h3>
            <form onSubmit={handleAddParticipant} className="space-y-4">
              <div>
                <label htmlFor="participantName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  參加者名稱 *
                </label>
                <input
                  id="participantName"
                  type="text"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="請輸入參加者名稱"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddParticipantModal(false);
                    setNewParticipantName('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 加減分 Modal */}
      {showScoreModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              為 {selectedParticipant.name} 加減分
            </h3>
            <form onSubmit={handleAddScore} className="space-y-4">
              <div>
                <label htmlFor="points" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  分數 *
                </label>
                <input
                  id="points"
                  type="number"
                  value={scorePoints}
                  onChange={(e) => setScorePoints(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：+10 或 -5"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">輸入正數為加分，負數為扣分</p>
              </div>
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  原因 *
                </label>
                <textarea
                  id="reason"
                  value={scoreReason}
                  onChange={(e) => setScoreReason(e.target.value)}
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
                    setShowScoreModal(false);
                    setSelectedParticipant(null);
                    setScorePoints('');
                    setScoreReason('');
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

      {/* 編輯參加者 Modal */}
      {showEditParticipantModal && editingParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">編輯參加者</h3>
            <form onSubmit={handleUpdateParticipant} className="space-y-4">
              <div>
                <label htmlFor="editParticipantName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  參加者名稱 *
                </label>
                <input
                  id="editParticipantName"
                  type="text"
                  value={editParticipantName}
                  onChange={(e) => setEditParticipantName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="請輸入參加者名稱"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditParticipantModal(false);
                    setEditingParticipant(null);
                    setEditParticipantName('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 批量增減分 Modal */}
      {showBatchScoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">批量增減分</h3>
            <form onSubmit={handleBatchAddScore} className="space-y-4">
              <div>
                <label htmlFor="batchPoints" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  分數 *
                </label>
                <input
                  id="batchPoints"
                  type="number"
                  value={batchScorePoints}
                  onChange={(e) => setBatchScorePoints(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="例如：+10 或 -5"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">輸入正數為加分，負數為扣分</p>
              </div>
              <div>
                <label htmlFor="batchReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  原因 *
                </label>
                <textarea
                  id="batchReason"
                  value={batchScoreReason}
                  onChange={(e) => setBatchScoreReason(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="請輸入加減分原因"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    選擇參加者 *
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
                  >
                    {selectedParticipants.size === participants.length ? '取消全選' : '全選'}
                  </button>
                </div>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  {participants.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">尚無參加者</p>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((participant) => (
                        <label
                          key={participant.id}
                          className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedParticipants.has(participant.id)}
                            onChange={() => handleToggleParticipant(participant.id)}
                            className="w-4 h-4 text-purple-600 dark:text-purple-400 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 bg-white dark:bg-gray-800"
                          />
                          <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{participant.name}</span>
                          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                            (總分: {participant.totalScore > 0 ? '+' : ''}{participant.totalScore})
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {selectedParticipants.size > 0 && (
                  <p className="mt-2 text-sm text-purple-600 dark:text-purple-400">
                    已選擇 {selectedParticipants.size} 位參加者
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowBatchScoreModal(false);
                    setSelectedParticipants(new Set());
                    setBatchScorePoints('');
                    setBatchScoreReason('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={selectedParticipants.size === 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  確認批量加減分
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 刪除參加者確認 Modal */}
      {showDeleteParticipantModal && deletingParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">確認刪除</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              您確定要刪除參加者「<span className="font-semibold">{deletingParticipant.name}</span>」嗎？
              <br />
              <span className="text-sm text-red-600 dark:text-red-400 mt-2 block">
                此操作將同時刪除該參加者的所有分數記錄，且無法復原。
              </span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteParticipantModal(false);
                  setDeletingParticipant(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteParticipant}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV 匯入 Modal */}
      {showImportCsvModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">CSV 匯入參加者</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2">CSV 檔案格式說明：</p>
                <ul className="text-sm text-blue-700 dark:text-blue-400 list-disc list-inside space-y-1">
                  <li>第一行可以是標題行（可選），包含「name」、「姓名」或「名稱」</li>
                  <li>每行一個參加者名稱</li>
                  <li>支援引號包裹的值</li>
                  <li>範例格式：</li>
                </ul>
                <pre className="mt-2 text-xs bg-white dark:bg-gray-900 p-2 rounded border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300">
{`姓名
張三
李四
王五`}
                </pre>
              </div>
              <div>
                <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  選擇 CSV 檔案 *
                </label>
                <input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  請選擇 .csv 格式的檔案
                </p>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportCsvModal(false);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

