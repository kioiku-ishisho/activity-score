'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser, loginUserByCode, getCurrentUser } from '@/lib/firebase-auth';
import { ThemeToggle } from '@/components/ThemeToggle';

// 強制動態渲染，避免預渲染時 ThemeProvider 未初始化
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [userCode, setUserCode] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [registeredUserCode, setRegisteredUserCode] = useState<string | null>(null);

  // 檢查是否已登入
  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (user) {
        router.push('/');
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setRegisteredUserCode(null);

    if (isRegister) {
      // 註冊流程
      if (!username.trim()) {
        setError('請輸入使用者名稱');
        return;
      }

      const result = await registerUser(username.trim());
      if (result.error) {
        setError(result.error);
      } else if (result.user && result.userCode) {
        setSuccessMessage(`註冊成功！您的用戶碼是：${result.userCode}，請妥善保管。`);
        setRegisteredUserCode(result.userCode);
        // 3 秒後自動跳轉
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 3000);
      }
    } else {
      // 登入流程
      if (!userCode.trim()) {
        setError('請輸入用戶碼');
        return;
      }

      if (userCode.trim().length !== 6 || !/^\d{6}$/.test(userCode.trim())) {
        setError('用戶碼必須為 6 位數字');
        return;
      }

      const result = await loginUserByCode(userCode.trim());
      if (result.error) {
        setError(result.error);
      } else {
        router.push('/');
        router.refresh();
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-800 dark:text-gray-100">活動計分管理系統</h1>
        
        {/* 切換登入/註冊 */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
              !isRegister
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            登入
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
              isRegister
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            註冊
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {isRegister ? (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                使用者名稱 *
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="請輸入使用者名稱"
                disabled={!!registeredUserCode}
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                註冊後系統會自動配發一個 6 位數字的用戶碼，請妥善保管以便後續登入
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="userCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                用戶碼（6 位數字）*
              </label>
              <input
                id="userCode"
                type="text"
                value={userCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setUserCode(value);
                  setError('');
                }}
                required
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                placeholder="000000"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                請輸入您的 6 位數字用戶碼以登入系統
              </p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {successMessage && registeredUserCode && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
              <p className="font-semibold mb-2">{successMessage}</p>
              <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border-2 border-green-500">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">您的用戶碼：</p>
                <p className="text-3xl font-mono font-bold text-center text-green-600 dark:text-green-400 tracking-widest">
                  {registeredUserCode}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  請記下此用戶碼，登入時需要使用
                </p>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!!registeredUserCode}
          >
            {isRegister ? '註冊' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
}

