'use client';

export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
            © 2026 活動計分管理系統
          </p>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="mr-2">聯絡資訊：</span>
            <a
              href="mailto:yuciao102164@gmail.com"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              yuciao102164@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

