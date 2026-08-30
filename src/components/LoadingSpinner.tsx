// src/components/LoadingSpinner.tsx
export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div 
        style={{ borderTopColor: 'transparent' }}
        className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 dark:border-gray-100 mb-4"
      ></div>
      <h1 className="text-2xl font-bold dark:text-gray-100">Bekræfter din tilmelding...</h1>
      <p className="text-gray-600 dark:text-gray-400">Dette tager kun et øjeblik.</p>
    </div>
  );
}