import ReviewPlanClient from './client';

export async function generateStaticParams() {
    const years = ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];
    return years.map((year) => ({
        year: year,
    }));
}

export default async function ReviewPlanPage({ params }: { params: Promise<{ year: string }> }) {
    const { year } = await params;
    return <ReviewPlanClient year={year} />;
}
