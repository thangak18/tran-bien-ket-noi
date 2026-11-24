import { useParams } from 'react-router-dom';

export function A03Result() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1 data-testid="screen-title">Cập nhật kết quả</h1>
      <span data-testid="report-id">{id}</span>
    </div>
  );
}
