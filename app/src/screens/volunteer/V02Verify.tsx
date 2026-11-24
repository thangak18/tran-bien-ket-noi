import { useParams } from 'react-router-dom';

export function V02Verify() {
  const { taskId } = useParams<{ taskId: string }>();
  return (
    <div>
      <h1 data-testid="screen-title">Xác minh tại chỗ</h1>
      <span data-testid="task-id">{taskId}</span>
    </div>
  );
}
