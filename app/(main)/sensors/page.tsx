import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getSensorsPaginated, getSensorTypesForSelect } from '@/data/sensors';
import { PageContainer } from '@/components/layout/PageContainer';
import { SensorsClient } from '@/components/sensors/SensorsClient';
import type { SensorSortField } from '@/data/sensors';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function SensorsPage({ searchParams }: Props) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const clerkUser = await currentUser();
  if (!clerkUser) redirect('/sign-in');

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const search = params.search ?? '';
  const sortField = (params.sort as SensorSortField) ?? 'name';
  const sortDir = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  const [paginatedData, sensorTypes] = await Promise.all([
    getSensorsPaginated({
      page,
      pageSize: 10,
      search: search || undefined,
      sortField,
      sortDir,
    }).catch(() => EMPTY_PAGE),
    getSensorTypesForSelect().catch(() => []),
  ]);

  return (
    <PageContainer
      heading="Sensores"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Sensores' },
      ]}
    >
      <SensorsClient initialData={paginatedData} sensorTypes={sensorTypes} />
    </PageContainer>
  );
}
