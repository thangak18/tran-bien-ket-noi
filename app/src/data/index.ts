import { DataSource } from './DataSource';
import { LocalDataSource } from './LocalDataSource';
import { ApiDataSource } from './ApiDataSource';

export * from './DataSource';
export * from './LocalDataSource';
export * from './ApiDataSource';

function createDataSource(): DataSource {
  const isApi =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_DATA_SOURCE === 'api';

  if (isApi) {
    return new ApiDataSource();
  }
  return new LocalDataSource();
}

export const dataSource: DataSource = createDataSource();
