import { getAssetTypesPaginated } from '@/data/asset-types';
import { PageContainer } from '@/components/layout/PageContainer';
import { AssetTypesClient } from '@/components/asset-types/AssetTypesClient';
import type { AssetTypeSortField } from '@/data/asset-types';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function AssetTypesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const search = params.search ?? '';
  const sortField = (params.sort as AssetTypeSortField) ?? 'name';
  const sortDir = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  const paginatedData = await getAssetTypesPaginated({
    page,
    pageSize: 10,
    search: search || undefined,
    sortField,
    sortDir,
  }).catch(() => EMPTY_PAGE);

  return (
    <PageContainer
      heading="Tipos de Activo"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Tipos de Activo' },
      ]}
    >
      <AssetTypesClient initialData={paginatedData} />
    </PageContainer>
  );
}
