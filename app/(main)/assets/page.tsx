import { getAssetsPaginated, getAssetTypesForSelect } from '@/data/assets';
import { PageContainer } from '@/components/layout/PageContainer';
import { AssetsClient } from '@/components/assets/AssetsClient';
import type { AssetSortField } from '@/data/assets';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function AssetsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const search = params.search ?? '';
  const sortField = (params.sort as AssetSortField) ?? 'number';
  const sortDir = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  const [paginatedData, assetTypes] = await Promise.all([
    getAssetsPaginated({
      page,
      pageSize: 10,
      search: search || undefined,
      sortField,
      sortDir,
    }).catch(() => EMPTY_PAGE),
    getAssetTypesForSelect().catch(() => []),
  ]);

  return (
    <PageContainer
      heading="Activos"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Activos' },
      ]}
    >
      <AssetsClient initialData={paginatedData} assetTypes={assetTypes} />
    </PageContainer>
  );
}
