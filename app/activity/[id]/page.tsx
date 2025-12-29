'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChange } from '@/lib/firebase-auth';
import {
  getActivity,
  getParticipantsByActivity,
  createParticipant,
  createParticipantsBatch,
  updateParticipant,
  deleteParticipant,
  getScoresByActivity,
  addScore,
  getScoresByParticipant,
} from '@/lib/firebase-db';
import { Activity, Participant, ParticipantWithScore, ScoreRecord, User } from '@/types';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  generateScoreListCSV,
  generateParticipantDetailCSV,
  generateTimeSequenceCSV,
  downloadCSV,
  ExportType,
} from '@/lib/csv-export';
import { formatDateTime } from '@/lib/utils';

export default function ActivityPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showEditParticipantModal, setShowEditParticipantModal] = useState(false);
  const [showBatchScoreModal, setShowBatchScoreModal] = useState(false);
  const [showDeleteParticipantModal, setShowDeleteParticipantModal] = useState(false);
  const [showImportCsvModal, setShowImportCsvModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('score-list');
  const [exportPreview, setExportPreview] = useState<string>('');
  const [exportPreviewData, setExportPreviewData] = useState<any[]>([]);
  const [selectedExportParticipant, setSelectedExportParticipant] = useState<string>('');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [newParticipantName, setNewParticipantName] = useState('');
  const [editParticipantName, setEditParticipantName] = useState('');
  const [participantError, setParticipantError] = useState('');
  const [scorePoints, setScorePoints] = useState('');
  const [scoreReason, setScoreReason] = useState('');
  const [batchScorePoints, setBatchScorePoints] = useState('');
  const [batchScoreReason, setBatchScoreReason] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (userData) => {
      if (!userData) {
        router.push('/login');
        return;
      }
      
      setUser(userData);
      await loadActivityData();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activityId, router]);

  const loadActivityData = async () => {
    const activityData = await getActivity(activityId);
    if (!activityData) {
      router.push('/');
      return;
    }
    setActivity(activityData);

    // 並行載入參加者和分數記錄，避免 N+1 查詢問題
    const [participantsData, scoresData] = await Promise.all([
      getParticipantsByActivity(activityId),
      getScoresByActivity(activityId),
    ]);

    // 在記憶體中計算每個參加者的總分
    const scoreMap = new Map<string, number>();
    scoresData.forEach(score => {
      const currentTotal = scoreMap.get(score.participantId) || 0;
      scoreMap.set(score.participantId, currentTotal + score.points);
    });

    const participantsWithScores: ParticipantWithScore[] = participantsData.map(p => ({
      ...p,
      totalScore: scoreMap.get(p.id) || 0,
    }));

    setParticipants(participantsWithScores);
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setParticipantError('');
    
    // 驗證字數限制
    if (newParticipantName.trim().length > 50) {
      setParticipantError('參加者名稱不能超過 50 字元');
      return;
    }
    
    if (newParticipantName.trim() && activityId) {
      const result = await createParticipant(newParticipantName.trim(), activityId);
      if (result === null) {
        setParticipantError('此活動中已存在相同姓名的參加者');
        return;
      }
      setNewParticipantName('');
      setShowAddParticipantModal(false);
      await loadActivityData();
    }
  };

  const handleAddScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setParticipantError('');
    
    // 驗證字數限制
    if (scoreReason.trim().length > 200) {
      setParticipantError('加減分原因不能超過 200 字元');
      return;
    }
    
    if (selectedParticipant && activityId && scorePoints && scoreReason.trim()) {
      const points = parseInt(scorePoints);
      if (!isNaN(points)) {
        const result = await addScore(selectedParticipant.id, activityId, points, scoreReason.trim());
        if (result) {
          setScorePoints('');
          setScoreReason('');
          setShowScoreModal(false);
          setSelectedParticipant(null);
          await loadActivityData();
        }
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

  const handleUpdateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setParticipantError('');
    
    // 驗證字數限制
    if (editParticipantName.trim().length > 50) {
      setParticipantError('參加者名稱不能超過 50 字元');
      return;
    }
    
    if (editingParticipant && editParticipantName.trim()) {
      const result = await updateParticipant(editingParticipant.id, editParticipantName.trim());
      if (result === null) {
        setParticipantError('此活動中已存在相同姓名的參加者');
        return;
      }
      setEditParticipantName('');
      setShowEditParticipantModal(false);
      setEditingParticipant(null);
      await loadActivityData();
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

  const handleBatchAddScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setParticipantError('');
    
    // 驗證字數限制
    if (batchScoreReason.trim().length > 200) {
      setParticipantError('加減分原因不能超過 200 字元');
      return;
    }
    
    if (selectedParticipants.size > 0 && activityId && batchScorePoints && batchScoreReason.trim()) {
      const points = parseInt(batchScorePoints);
      if (!isNaN(points)) {
        await Promise.all(
          Array.from(selectedParticipants).map(participantId =>
            addScore(participantId, activityId, points, batchScoreReason.trim())
          )
        );
        setBatchScorePoints('');
        setBatchScoreReason('');
        setSelectedParticipants(new Set());
        setShowBatchScoreModal(false);
        await loadActivityData();
      }
    }
  };

  const openBatchScoreModal = () => {
    setSelectedParticipants(new Set());
    setBatchScorePoints('');
    setBatchScoreReason('');
    setShowBatchScoreModal(true);
  };

  const handleExportTypeChange = async (type: ExportType) => {
    setExportType(type);
    if (type === 'participant-detail') {
      // 個人明細表預設為空，不選擇參加者
      setSelectedExportParticipant('');
      setExportPreview('');
      setExportPreviewData([]);
    } else {
      setSelectedExportParticipant('');
      await generateExportPreview(type);
    }
  };

  const handleExportParticipantChange = async (participantId: string) => {
    setSelectedExportParticipant(participantId);
    // 立即清除舊的預覽資料，避免顯示上一個人的資料
    setExportPreview('');
    setExportPreviewData([]);
    if (exportType === 'participant-detail' && participantId) {
      // 直接傳遞 participantId 參數，避免狀態更新延遲問題
      await generateParticipantDetailPreview(participantId);
    }
  };

  const generateParticipantDetailPreview = async (participantId: string) => {
    if (!activity) return;

    const selectedParticipant = participants.find(p => p.id === participantId);
    if (!selectedParticipant) {
      setExportPreview('');
      setExportPreviewData([]);
      return;
    }

    const scores = await getScoresByParticipant(participantId);
    
    // 如果沒有分數記錄
    if (scores.length === 0) {
      setExportPreview('');
      setExportPreviewData([]);
      return;
    }
    
    const scoresByParticipant = new Map<string, ScoreRecord[]>();
    scoresByParticipant.set(participantId, scores);
    
    const csvContent = generateParticipantDetailCSV(
      [{ id: selectedParticipant.id, name: selectedParticipant.name }],
      scoresByParticipant
    );
    
    const previewData = scores.slice(0, 6).map(score => ({
      參加者: selectedParticipant.name,
      時間: formatDateTime(score.createdAt),
      分數: score.points,
      原因: score.reason,
    }));

    setExportPreview(csvContent);
    setExportPreviewData(previewData);
  };

  const generateExportPreview = async (type: ExportType) => {
    if (!activity) return;

    let csvContent = '';
    let previewData: any[] = [];

    switch (type) {
      case 'score-list':
        const scoreListData = participants
          .map(p => ({ name: p.name, totalScore: p.totalScore }))
          .sort((a, b) => b.totalScore - a.totalScore);
        csvContent = generateScoreListCSV(scoreListData);
        previewData = scoreListData.slice(0, 6).map(p => ({
          參加者: p.name,
          總分: p.totalScore,
        }));
        setExportPreview(csvContent);
        setExportPreviewData(previewData);
        break;

      case 'participant-detail':
        // 個人明細表使用專門的函數處理
        if (!selectedExportParticipant) {
          setExportPreview('');
          setExportPreviewData([]);
        } else {
          await generateParticipantDetailPreview(selectedExportParticipant);
        }
        break;

      case 'time-sequence':
        const allScores: ScoreRecord[] = [];
        const participantMap = new Map<string, { name: string }>();
        await Promise.all(
          participants.map(async (p) => {
            participantMap.set(p.id, { name: p.name });
            const scores = await getScoresByParticipant(p.id);
            allScores.push(...scores);
          })
        );
        const sortedScores = allScores.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        csvContent = generateTimeSequenceCSV(sortedScores, participantMap);
        
        previewData = sortedScores.slice(0, 6).map(score => {
          const participant = participantMap.get(score.participantId);
          return {
            時間: formatDateTime(score.createdAt),
            參加者: participant?.name || '未知',
            分數: score.points,
            原因: score.reason,
          };
        });
        setExportPreview(csvContent);
        setExportPreviewData(previewData);
        break;
    }
  };

  const openExportModal = async () => {
    setExportType('score-list');
    setSelectedExportParticipant('');
    await generateExportPreview('score-list');
    setShowExportModal(true);
  };

  const handleDownloadCSV = () => {
    if (!activity || !exportPreview) return;

    const typeNames = {
      'score-list': '分數名單表',
      'participant-detail': '個人明細表',
      'time-sequence': '時間序計分表',
    };

    const filename = `${activity.name}_${typeNames[exportType]}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(exportPreview, filename);
  };

  const handleDeleteParticipant = (participant: Participant) => {
    setDeletingParticipant(participant);
    setShowDeleteParticipantModal(true);
  };

  const confirmDeleteParticipant = async () => {
    if (deletingParticipant) {
      await deleteParticipant(deletingParticipant.id);
      setShowDeleteParticipantModal(false);
      setDeletingParticipant(null);
      await loadActivityData();
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
      if (values.length > 0 && values[0]) {
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
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const names = parseCSV(text);
        
        if (names.length === 0) {
          alert('CSV 檔案中沒有找到有效的參加者名稱');
          return;
        }

        // 批量創建參加者（會自動過濾重複的）
        const created = await createParticipantsBatch(names, activityId);
        setShowImportCsvModal(false);
        await loadActivityData();
        const skipped = names.length - created.length;
        if (skipped > 0) {
          alert(`成功匯入 ${created.length} 位參加者，跳過 ${skipped} 位重複的參加者`);
        } else {
          alert(`成功匯入 ${created.length} 位參加者`);
        }
      } catch (error) {
        console.error('CSV 解析錯誤:', error);
        alert('CSV 檔案解析失敗，請檢查檔案格式');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  if (loading || !user || !activity) {
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
                href="/"
                className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors whitespace-nowrap"
              >
                ← 返回首頁
              </Link>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 truncate flex-1 sm:flex-none">{activity.name}</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <ThemeToggle />
              <span className="text-sm sm:text-base text-gray-600 dark:text-gray-300 truncate max-w-[120px] sm:max-w-none">{user.username}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* 活動資訊卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          {activity.description && (
            <div className="mb-3">
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">{activity.description}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="font-medium">建立者：</span>
              <span className="text-gray-800 dark:text-gray-200">{activity.ownerUsername || '未知'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">PIN 碼：</span>
              <span className="font-mono text-gray-800 dark:text-gray-200">{activity.pin}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">參加者列表</h2>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            {participants.length > 0 && (
              <>
                <button
                  onClick={openExportModal}
                  className="bg-indigo-600 text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors font-medium text-xs sm:text-base flex-1 sm:flex-none"
                >
                  📤 匯出 CSV
                </button>
                <button
                  onClick={openBatchScoreModal}
                  className="bg-purple-600 text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors font-medium text-xs sm:text-base flex-1 sm:flex-none"
                >
                  📊 批量增減分
                </button>
              </>
            )}
            <button
              onClick={() => setShowImportCsvModal(true)}
              className="bg-orange-600 text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors font-medium text-xs sm:text-base flex-1 sm:flex-none"
            >
              📥 CSV 匯入
            </button>
            <button
              onClick={() => setShowAddParticipantModal(true)}
              className="bg-green-600 text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium text-xs sm:text-base flex-1 sm:flex-none"
            >
              + 新增參加者
            </button>
          </div>
        </div>

        {participants.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 sm:p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">尚無參加者，請新增第一個參加者</p>
          </div>
        ) : (
          <>
            {/* 桌面版表格 */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
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
                    <tr 
                      key={participant.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => router.push(`/participant/${participant.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-900 dark:text-gray-100 font-medium">
                          {participant.name}
                        </span>
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
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

            {/* 手機版卡片 */}
            <div className="md:hidden space-y-4">
              {participants.map((participant) => (
                <div 
                  key={participant.id} 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/participant/${participant.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
                      {participant.name}
                    </span>
                    <span
                      className={`text-xl font-bold ml-2 ${
                        participant.totalScore >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {participant.totalScore > 0 ? '+' : ''}
                      {participant.totalScore}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditParticipant(participant)}
                      className="flex-1 px-3 py-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => openScoreModal(participant)}
                      className="flex-1 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                    >
                      加減分
                    </button>
                    <button
                      onClick={() => handleDeleteParticipant(participant)}
                      className="flex-1 px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* 新增參加者 Modal */}
      {showAddParticipantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">新增參加者</h3>
            {participantError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                {participantError}
              </div>
            )}
            <form onSubmit={handleAddParticipant} className="space-y-4">
              <div>
                <label htmlFor="participantName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  參加者名稱 * <span className="text-xs text-gray-500 dark:text-gray-400">（最多 50 字元）</span>
                </label>
                <input
                  id="participantName"
                  type="text"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  required
                  maxLength={50}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="請輸入參加者名稱"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {newParticipantName.length}/50
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddParticipantModal(false);
                    setNewParticipantName('');
                    setParticipantError('');
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
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                  原因 * <span className="text-xs text-gray-500 dark:text-gray-400">（最多 200 字元）</span>
                </label>
                <textarea
                  id="reason"
                  value={scoreReason}
                  onChange={(e) => setScoreReason(e.target.value)}
                  required
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入加減分原因"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {scoreReason.length}/200
                </p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">編輯參加者</h3>
            {participantError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                {participantError}
              </div>
            )}
            <form onSubmit={handleUpdateParticipant} className="space-y-4">
              <div>
                <label htmlFor="editParticipantName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  參加者名稱 * <span className="text-xs text-gray-500 dark:text-gray-400">（最多 50 字元）</span>
                </label>
                <input
                  id="editParticipantName"
                  type="text"
                  value={editParticipantName}
                  onChange={(e) => setEditParticipantName(e.target.value)}
                  required
                  maxLength={50}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="請輸入參加者名稱"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {editParticipantName.length}/50
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditParticipantModal(false);
                    setEditingParticipant(null);
                    setEditParticipantName('');
                    setParticipantError('');
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
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  原因 * <span className="text-xs text-gray-500 dark:text-gray-400">（最多 200 字元）</span>
                </label>
                <textarea
                  id="batchReason"
                  value={batchScoreReason}
                  onChange={(e) => setBatchScoreReason(e.target.value)}
                  required
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="請輸入加減分原因"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {batchScoreReason.length}/200
                </p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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

      {/* CSV 匯出 Modal */}
      {showExportModal && activity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              匯出活動資料 - {activity.name}
            </h3>
            
            {/* 匯出類型選擇 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                選擇匯出格式 *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleExportTypeChange('score-list')}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    exportType === 'score-list'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">分數名單表</div>
                  <div className="text-xs mt-1 opacity-75">參加者名稱與總分</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportTypeChange('participant-detail')}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    exportType === 'participant-detail'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">個人明細表</div>
                  <div className="text-xs mt-1 opacity-75">每位參加者的分數明細</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportTypeChange('time-sequence')}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    exportType === 'time-sequence'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">時間序計分表</div>
                  <div className="text-xs mt-1 opacity-75">依時間排序的所有計分記錄</div>
                </button>
              </div>
            </div>

            {/* 個人明細表 - 參加者選擇 */}
            {exportType === 'participant-detail' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  選擇參加者 *
                </label>
                <select
                  value={selectedExportParticipant}
                  onChange={(e) => handleExportParticipantChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">請選擇參加者</option>
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name} (總分: {participant.totalScore > 0 ? '+' : ''}{participant.totalScore})
                    </option>
                  ))}
                </select>
                {!selectedExportParticipant && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    請選擇參加者
                  </p>
                )}
              </div>
            )}

            {/* 預覽區域 */}
            <div className="flex-1 mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                預覽內容（僅顯示前 6 筆）
              </label>
              {exportType === 'participant-detail' && !selectedExportParticipant ? (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">請選擇參加者以預覽</p>
                </div>
              ) : exportType === 'participant-detail' && selectedExportParticipant && exportPreviewData.length === 0 ? (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">無記錄</p>
                </div>
              ) : exportPreviewData.length > 0 ? (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          {Object.keys(exportPreviewData[0]).map((key) => (
                            <th
                              key={key}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {exportPreviewData.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            {Object.values(row).map((value: any, cellIndex) => (
                              <td
                                key={cellIndex}
                                className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
                              >
                                {typeof value === 'number' && value >= 0 ? '+' : ''}
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">請選擇匯出格式...</p>
                </div>
              )}
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  setExportPreview('');
                  setExportPreviewData([]);
                  setSelectedExportParticipant('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDownloadCSV}
                disabled={!exportPreview || (exportType === 'participant-detail' && (!selectedExportParticipant || exportPreviewData.length === 0))}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                下載 CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

