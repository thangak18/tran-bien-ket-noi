import { DataSource } from './DataSource';
import { LocalDataSource } from './LocalDataSource';
import { ApiDataSource } from './ApiDataSource';
import { isApiMode } from '../lib/api';

export * from './DataSource';
export * from './LocalDataSource';
export * from './ApiDataSource';

export { isApiMode };

export const apiDataSource = new ApiDataSource();

/**
 * Nguồn dữ liệu dùng ngoài React (không có store). Trong React hãy dùng useDataSource()
 * để chế độ local ghi thẳng vào AppStore đang hiển thị.
 */
export const dataSource: DataSource = isApiMode() ? apiDataSource : new LocalDataSource();
