import { Activity, Participant, ScoreRecord } from '@/types';
import { formatDateTime } from './utils';

export type ExportType = 'score-list' | 'participant-detail' | 'time-sequence';

interface ScoreListRow {
  參加者: string;
  總分: number;
}

interface ParticipantDetailRow {
  參加者: string;
  時間: string;
  分數: number;
  原因: string;
}

interface TimeSequenceRow {
  時間: string;
  參加者: string;
  分數: number;
  原因: string;
}

/**
 * 生成分數名單表 CSV
 */
export function generateScoreListCSV(
  participants: { name: string; totalScore: number }[]
): string {
  const rows: ScoreListRow[] = participants.map(p => ({
    參加者: p.name,
    總分: p.totalScore,
  }));

  // 按總分降序排序
  rows.sort((a, b) => b.總分 - a.總分);

  const headers = ['參加者', '總分'];
  const csvRows = [
    headers.join(','),
    ...rows.map(row => `${row.參加者},${row.總分}`),
  ];

  return csvRows.join('\n');
}

/**
 * 生成個人明細表 CSV
 */
export function generateParticipantDetailCSV(
  participants: { id: string; name: string }[],
  scoresByParticipant: Map<string, ScoreRecord[]>
): string {
  const rows: ParticipantDetailRow[] = [];

  participants.forEach(participant => {
    const scores = scoresByParticipant.get(participant.id) || [];
    if (scores.length === 0) {
      rows.push({
        參加者: participant.name,
        時間: '',
        分數: 0,
        原因: '尚無分數記錄',
      });
    } else {
      scores.forEach(score => {
        rows.push({
          參加者: participant.name,
          時間: formatDateTime(score.createdAt),
          分數: score.points,
          原因: score.reason,
        });
      });
    }
  });

  const headers = ['參加者', '時間', '分數', '原因'];
  const csvRows = [
    headers.join(','),
    ...rows.map(row => 
      `${row.參加者},"${row.時間}",${row.分數},"${row.原因}"`
    ),
  ];

  return csvRows.join('\n');
}

/**
 * 生成時間序計分表 CSV
 */
export function generateTimeSequenceCSV(
  scores: ScoreRecord[],
  participants: Map<string, { name: string }>
): string {
  const rows: TimeSequenceRow[] = scores
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(score => {
      const participant = participants.get(score.participantId);
      return {
        時間: formatDateTime(score.createdAt),
        參加者: participant?.name || '未知',
        分數: score.points,
        原因: score.reason,
      };
    });

  const headers = ['時間', '參加者', '分數', '原因'];
  const csvRows = [
    headers.join(','),
    ...rows.map(row => 
      `"${row.時間}",${row.參加者},${row.分數},"${row.原因}"`
    ),
  ];

  return csvRows.join('\n');
}

/**
 * 下載 CSV 檔案
 */
export function downloadCSV(csvContent: string, filename: string) {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

