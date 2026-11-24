import { useParams } from 'react-router-dom';

export function A02Panel() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1 data-testid="screen-title">Chi tiết & Giao xử lý</h1>
      <span data-testid="report-id">{id}</span>
    </div>
  );
}
