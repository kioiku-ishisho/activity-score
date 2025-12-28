/**
 * 格式化時間為「年月日時分」格式
 * @param dateString ISO 日期字串
 * @returns 格式化後的時間字串，格式：YYYY年MM月DD日 HH:MM
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

/**
 * 格式化時間為「年月日」格式
 * @param dateString ISO 日期字串
 * @returns 格式化後的日期字串，格式：YYYY年MM月DD日
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}年${month}月${day}日`;
}

