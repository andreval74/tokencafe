import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface StatusLogProps {
  logs: LogEntry[];
}

export default function StatusLog({ logs }: StatusLogProps) {
  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getTextColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-300';
      case 'error':
        return 'text-red-300';
      default:
        return 'text-gray-300';
    }
  };

  if (logs.length === 0) {
    return (
      <div className="p-4 bg-gray-800/30 border border-gray-600 rounded-xl">
        <p className="text-gray-400 text-center">Pronto para começar.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800/30 border border-gray-600 rounded-xl max-h-64 overflow-y-auto">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Log de Status</h3>
      <div className="space-y-3">
        {logs.slice().reverse().map((log) => (
          <div key={log.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(log.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs text-gray-500 font-mono">
                  {log.timestamp.toLocaleTimeString('pt-BR')}
                </span>
              </div>
              <p className={`text-sm ${getTextColor(log.type)} leading-relaxed`}>
                {log.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
