'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ClassDetailsClient from './client';

function ClassViewContent() {
    const searchParams = useSearchParams();
    const classId = searchParams.get('id');

    if (!classId) return <div>Class ID not provided</div>;

    return <ClassDetailsClient classId={classId} />;
}

export default function ClassViewPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ClassViewContent />
        </Suspense>
    );
}
