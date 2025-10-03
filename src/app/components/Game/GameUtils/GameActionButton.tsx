// app/components/Game/GameActionButton.tsx
'use client'

export const GameActionButton = ({ icon: Icon, label, active, disabled, onClick, color = 'blue' }) => {
  const colorClasses = {
    blue: active ? 'bg-blue-500 text-white' : 'bg-white text-blue-500 border-blue-200',
    red: active ? 'bg-red-500 text-white' : 'bg-white text-red-500 border-red-200',
    green: active ? 'bg-green-500 text-white' : 'bg-white text-green-500 border-green-200',
    yellow: active ? 'bg-yellow-500 text-white' : 'bg-white text-yellow-500 border-yellow-200',
    amber: active ? 'bg-amber-500 text-white' : 'bg-white text-amber-500 border-amber-200',
    purple: active ? 'bg-purple-500 text-white' : 'bg-white text-purple-500 border-purple-200',
    gray: active ? 'bg-gray-500 text-white' : 'bg-white text-gray-500 border-gray-200',
    indigo: active ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-500 border-indigo-200'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200
        ${colorClasses[color]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        min-h-[60px] min-w-[60px]
      `}
    >
      <Icon size={20} />
      <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
  );
};