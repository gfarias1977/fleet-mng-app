import { getSensorTypesPaginated } from '@/data/sensor-types';
import { PageContainer } from '@/components/layout/PageContainer';
import { SensorTypesClient } from '@/components/sensor-types/SensorTypesClient';
import type { SensorTypeSortField } from '@/data/sensor-types';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function SensorTypesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const search = params.search ?? '';
  const sortField = (params.sort as SensorTypeSortField) ?? 'name';
  const sortDir = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  const paginatedData = await getSensorTypesPaginated({
    page,
    pageSize: 10,
    search: search || undefined,
    sortField,
    sortDir,
  }).catch(() => EMPTY_PAGE);

  return (
    <PageContainer
      heading="Tipos de Sensor"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Tipos de Sensor' },
      ]}
    >
      <SensorTypesClient initialData={paginatedData} />
    </PageContainer>
  );
}
