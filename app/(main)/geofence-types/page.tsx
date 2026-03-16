import { getGeofenceTypesPaginated } from '@/data/geofence-types';
import { PageContainer } from '@/components/layout/PageContainer';
import { GeofenceTypesClient } from '@/components/geofence-types/GeofenceTypesClient';
import type { GeofenceTypeSortField } from '@/data/geofence-types';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function GeofenceTypesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const search = params.search ?? '';
  const sortField = (params.sort as GeofenceTypeSortField) ?? 'name';
  const sortDir = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  const paginatedData = await getGeofenceTypesPaginated({
    page,
    pageSize: 10,
    search: search || undefined,
    sortField,
    sortDir,
  }).catch(() => EMPTY_PAGE);

  return (
    <PageContainer
      heading="Geofence Types"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Geofence Types' },
      ]}
    >
      <GeofenceTypesClient initialData={paginatedData} />
    </PageContainer>
  );
}
