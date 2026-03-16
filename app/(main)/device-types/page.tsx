import { getDeviceTypesPaginated } from '@/data/device-types';
import { PageContainer } from '@/components/layout/PageContainer';
import { DeviceTypesClient } from '@/components/device-types/DeviceTypesClient';
import type { DeviceTypeSortField } from '@/data/device-types';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function DeviceTypesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const search = params.search ?? '';
  const sortField = (params.sort as DeviceTypeSortField) ?? 'name';
  const sortDir = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  const paginatedData = await getDeviceTypesPaginated({
    page,
    pageSize: 10,
    search: search || undefined,
    sortField,
    sortDir,
  }).catch(() => EMPTY_PAGE);

  return (
    <PageContainer
      heading="Tipos de Dispositivo"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Tipos de Dispositivo' },
      ]}
    >
      <DeviceTypesClient initialData={paginatedData} />
    </PageContainer>
  );
}
