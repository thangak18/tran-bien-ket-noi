import { useParams } from 'react-router-dom';

export function C06Detail() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1 data-testid="screen-title">Chi tiết phản ánh</h1>
      <span data-testid="report-id">{id}</span>
    </div>
  );
}
