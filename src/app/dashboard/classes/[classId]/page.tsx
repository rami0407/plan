import ClassEditorClient from './client';

export async function generateStaticParams() {
    const classes = [
        'class-1', 'class-2', 'class-3', 'class-4', 'class-5', 'class-6',
        'class-7', 'class-8', 'class-9', 'class-10', 'class-11', 'class-12',
        'class-13', 'class-14', 'class-15', 'class-16', 'class-17', 'class-18'
    ];

    return classes.map((classId) => ({
        classId,
    }));
}

export default function ClassPage({ params }: { params: { classId: string } }) {
    return <ClassEditorClient classId={params.classId} />;
}
