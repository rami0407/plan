import EditorClient from './client';

interface PageProps {
    params: {
        classId: string;
        quarter: string;
    };
}

// Generate static paths for all class/quarter combinations
export async function generateStaticParams() {
    const classes = Array.from({ length: 18 }, (_, i) => `class-${i + 1}`);
    const quarters = ['q1', 'q2', 'q3', 'q4'];

    const paths = [];
    for (const classId of classes) {
        for (const quarter of quarters) {
            paths.push({ classId, quarter });
        }
    }

    return paths;
}

export default function EditorPage({ params }: PageProps) {
    return <EditorClient classId={params.classId} quarter={params.quarter} />;
}
