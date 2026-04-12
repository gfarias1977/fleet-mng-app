import { getAlertTypesPaginated } from '@/data/alert-types';
import { PageContainer } from '@/components/layout/PageContainer';
import { AlertTypesClient } from '@/components/alert-types/AlertTypesClient';
import type { AlertTypeSortField } from '@/data/alert-types';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function AlertTypesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const search = params.search ?? '';
  const sortField = (params.sort as AlertTypeSortField) ?? 'name';
  const sortDir = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  const paginatedData = await getAlertTypesPaginated({
    page,
    pageSize: 10,
    search: search || undefined,
    sortField,
    sortDir,
  }).catch(() => EMPTY_PAGE);

  return (
    <PageContainer
      heading="Tipos de Alerta"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Tipos de Alerta' },
      ]}
    >
      <AlertTypesClient initialData={paginatedData} />
    </PageContainer>
  );
}
