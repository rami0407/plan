
import EditPlanClient from './client';

export async function generateStaticParams() {
    // Generate years from 2023 to 2040
    const MIN_YEAR = 2023;
    const MAX_YEAR = 2040;
    const years = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => String(MIN_YEAR + i));
    return years.map((year) => ({
        year: year,
    }));
}

export default async function EditPlanPage({ params }: { params: Promise<{ year: string }> }) {
    const { year } = await params;
    return <EditPlanClient year={year} />;
}
