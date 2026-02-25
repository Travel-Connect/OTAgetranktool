interface EmptyStateProps {
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ message = "データがありません", action }: EmptyStateProps) {
  return (
    <div className="text-center py-10 text-gray-400">
      <p className="text-sm">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
