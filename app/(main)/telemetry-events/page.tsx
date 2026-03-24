import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByEmail } from '@/data/users';
import { getTelemetryEventsPaginated } from '@/data/telemetry-events';
import { PageContainer } from '@/components/layout/PageContainer';
import { TelemetryEventsClient } from '@/components/telemetry-events/TelemetryEventsClient';
import type { TelemetrySortField } from '@/data/telemetry-events';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function TelemetryEventsPage({ searchParams }: Props) {
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
  const sortField = (params.sort as TelemetrySortField) ?? 'eventTimestamp';
  const sortDir = (params.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  const [paginatedData] = await Promise.all([
    getTelemetryEventsPaginated(user.id, {
      page,
      pageSize: 10,
      search: search || undefined,
      sortField,
      sortDir,
    }).catch(() => EMPTY_PAGE),
  ]);

  return (
    <PageContainer
      heading="Telemetría"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Telemetría' },
      ]}
    >
      <TelemetryEventsClient initialData={paginatedData} />
    </PageContainer>
  );
}
