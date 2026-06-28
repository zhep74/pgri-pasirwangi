import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface AlertConfig {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface CustomAlertProps {
  config: AlertConfig;
  onClose: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({ config, onClose }) => {
  if (!config.isOpen) return null;

  const getIcon = () => {
    switch (config.type) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-emerald-500 animate-bounce" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500 animate-pulse" />;
      case 'warning':
        return <AlertTriangle className="w-16 h-16 text-amber-500 animate-pulse" />;
      default:
        return <Info className="w-16 h-16 text-blue-500 animate-bounce" />;
    }
  };

  const getHeaderColor = () => {
    switch (config.type) {
      case 'success': return 'border-emerald-100 dark:border-emerald-950';
      case 'error': return 'border-red-100 dark:border-red-950';
      case 'warning': return 'border-amber-100 dark:border-amber-950';
      default: return 'border-blue-100 dark:border-blue-950';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className={`relative w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border ${getHeaderColor()} transform transition-all scale-100 duration-300 animate-scale-up`}>
        {/* Decorative Top Accent */}
        <div className={`h-2 w-full ${
          config.type === 'success' ? 'bg-emerald-500' :
          config.type === 'error' ? 'bg-red-500' :
          config.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
        }`} />

        <div className="p-6 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-4">
            {getIcon()}
          </div>

          {/* Title */}
          <h3 className="mb-2 text-xl font-bold text-slate-800 dark:text-slate-100">
            {config.title}
          </h3>

          {/* Message */}
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
            {config.message}
          </p>

          {/* Actions */}
          <div className="flex gap-3 w-full justify-center">
            {config.onCancel && (
              <button
                onClick={() => {
                  if (config.onCancel) config.onCancel();
                  onClose();
                }}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition duration-200 cursor-pointer"
              >
                {config.cancelText || 'Batal'}
              </button>
            )}
            <button
              onClick={() => {
                if (config.onConfirm) config.onConfirm();
                onClose();
              }}
              className={`px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-lg transition duration-200 cursor-pointer ${
                config.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' :
                config.type === 'error' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' :
                config.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' :
                'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
              }`}
            >
              {config.confirmText || 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
