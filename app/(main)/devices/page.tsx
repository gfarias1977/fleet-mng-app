import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByEmail } from '@/data/users';
import { getDevicesPaginated, getDeviceTypesForSelect, getAssetsForSelect } from '@/data/devices';
import { PageContainer } from '@/components/layout/PageContainer';
import { DevicesClient } from '@/components/devices/DevicesClient';
import type { DeviceSortField } from '@/data/devices';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function DevicesPage({ searchParams }: Props) {
  const params = await searchParams;

  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) redirect('/sign-in');
  const user = await getUserByEmail(primaryEmail);
  if (!user) redirect('/sign-in');

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const search = params.search ?? '';
  const sortField = (params.sort as DeviceSortField) ?? 'name';
  const sortDir = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  const [paginatedData, deviceTypes, assets] = await Promise.all([
    getDevicesPaginated(user.id, {
      page,
      pageSize: 10,
      search: search || undefined,
      sortField,
      sortDir,
    }).catch(() => EMPTY_PAGE),
    getDeviceTypesForSelect().catch(() => []),
    getAssetsForSelect().catch(() => []),
  ]);

  return (
    <PageContainer
      heading="Dispositivos"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Dispositivos' },
      ]}
    >
      <DevicesClient initialData={paginatedData} deviceTypes={deviceTypes} assets={assets} />
    </PageContainer>
  );
}
