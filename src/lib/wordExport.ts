import { saveAs } from 'file-saver';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    Table,
    TableRow,
    TableCell,
    WidthType,
    HeadingLevel,
    SectionType
} from 'docx';

// Helper to create header cell for tables
const createHeaderCell = (text: string) => new TableCell({
    children: [new Paragraph({
        children: [new TextRun({ text, bold: true, color: "FFFFFF", rightToLeft: true })],
        alignment: AlignmentType.RIGHT,
        bidirectional: true
    })],
    shading: { fill: "1E3A8A" }, // Navy blue primary color
    margins: { top: 120, bottom: 120, left: 150, right: 150 }
});

// Helper to create normal data cell
const createDataCell = (text: string, isCenter = false) => new TableCell({
    children: [new Paragraph({
        children: [new TextRun({ text: text || '---', rightToLeft: true })],
        alignment: isCenter ? AlignmentType.CENTER : AlignmentType.RIGHT,
        bidirectional: true
    })],
    margins: { top: 100, bottom: 100, left: 150, right: 150 }
});

export const exportPlanToWord = async (planData: any, year: string) => {
    const profile = planData.profile || {};
    const teachingStaff = planData.teachingStaff || [];
    const schoolProfileTable = planData.schoolProfileTable || [];
    const bookList = planData.bookList || [];
    const goals = planData.goals || [];
    const yearlyGoals = planData.yearlyGoals || '';
    const integrationPlans = planData.integrationPlans || [];

    const children: any[] = [];

    // 1. Title / Header
    children.push(
        new Paragraph({
            children: [new TextRun({ text: `خطة العمل السنوية للعام الدراسي ${year}`, bold: true, rightToLeft: true })],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            bidirectional: true
        }),
        new Paragraph({
            children: [
                new TextRun({ text: `المركز: ${profile.name || '---'}`, bold: true, size: 28, rightToLeft: true }),
                new TextRun({ text: `  |  `, size: 28 }),
                new TextRun({ text: `المادة الدراسية: ${profile.subject || '---'}`, bold: true, size: 28, rightToLeft: true }),
            ],
            alignment: AlignmentType.CENTER,
            bidirectional: true
        }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "" })
    );

    // 2. General Yearly Goals
    if (yearlyGoals) {
        children.push(
            new Paragraph({
                children: [new TextRun({ text: "🎯 الأهداف العامة للسنة", bold: true, rightToLeft: true })],
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.RIGHT,
                bidirectional: true
            }),
            new Paragraph({
                children: [new TextRun({ text: yearlyGoals, rightToLeft: true })],
                alignment: AlignmentType.RIGHT,
                bidirectional: true
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" })
        );
    }

    // 3. Teaching Staff Table
    if (teachingStaff.length > 0) {
        const staffRows = [
            new TableRow({
                children: [
                    createHeaderCell("الصفوف"),
                    createHeaderCell("آخر استكمال"),
                    createHeaderCell("الهاتف"),
                    createHeaderCell("الإيميل"),
                    createHeaderCell("اسم المعلم"),
                ]
            }),
            ...teachingStaff.map((staff: any) => new TableRow({
                children: [
                    createDataCell(staff.classes),
                    createDataCell(staff.lastTraining),
                    createDataCell(staff.phone),
                    createDataCell(staff.email),
                    createDataCell(staff.name),
                ]
            }))
        ];

        children.push(
            new Paragraph({
                children: [new TextRun({ text: "🧑‍🏫 طاقم التدريس (Teaching Staff)", bold: true, rightToLeft: true })],
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.RIGHT,
                bidirectional: true
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                visuallyRightToLeft: true,
                rows: staffRows,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" })
        );
    }

    // 4. School Profile Table
    const filteredProfile = schoolProfileTable.filter((row: any) => row.className || row.teacherName);
    if (filteredProfile.length > 0) {
        const profileRows = [
            new TableRow({
                children: [
                    createHeaderCell("ملاحظات"),
                    createHeaderCell("متعثرون"),
                    createHeaderCell("متميزون"),
                    createHeaderCell("س. فردية"),
                    createHeaderCell("س. تعليمية"),
                    createHeaderCell("الطلاب"),
                    createHeaderCell("المعلم"),
                    createHeaderCell("الصف"),
                ]
            }),
            ...filteredProfile.map((row: any) => new TableRow({
                children: [
                    createDataCell(row.notes),
                    createDataCell(String(row.strugglingCount || 0), true),
                    createDataCell(String(row.outstandingCount || 0), true),
                    createDataCell(String(row.individualHours || 0), true),
                    createDataCell(String(row.teachingHours || 0), true),
                    createDataCell(String(row.studentCount || 0), true),
                    createDataCell(row.teacherName),
                    createDataCell(row.className),
                ]
            }))
        ];

        children.push(
            new Paragraph({
                children: [new TextRun({ text: "📊 البروفايل المدرسي (School Profile)", bold: true, rightToLeft: true })],
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.RIGHT,
                bidirectional: true
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                visuallyRightToLeft: true,
                rows: profileRows,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" })
        );
    }

    // 5. Book List Table
    const filteredBooks = bookList.filter((row: any) => row.layer || row.bookName || row.publisher);
    if (filteredBooks.length > 0) {
        const bookRows = [
            new TableRow({
                children: [
                    createHeaderCell("السنة"),
                    createHeaderCell("المؤلف"),
                    createHeaderCell("الناشر"),
                    createHeaderCell("اسم الكتاب"),
                    createHeaderCell("الطبقة/الصف"),
                ]
            }),
            ...filteredBooks.map((row: any) => new TableRow({
                children: [
                    createDataCell(row.year, true),
                    createDataCell(row.author),
                    createDataCell(row.publisher),
                    createDataCell(row.bookName),
                    createDataCell(row.layer),
                ]
            }))
        ];

        children.push(
            new Paragraph({
                children: [new TextRun({ text: "📚 قائمة الكتب الدراسية (Book List)", bold: true, rightToLeft: true })],
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.RIGHT,
                bidirectional: true
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                visuallyRightToLeft: true,
                rows: bookRows,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" })
        );
    }

    // 6. Detailed Goals & Tasks
    if (goals.length > 0) {
        children.push(
            new Paragraph({
                children: [new TextRun({ text: "🎯 الأهداف والمهام التنفيذية", bold: true, rightToLeft: true })],
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.RIGHT,
                bidirectional: true
            })
        );

        goals.forEach((goal: any, index: number) => {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: `الهدف ${index + 1}: ${goal.title || '---'}`, bold: true, rightToLeft: true })],
                    heading: HeadingLevel.HEADING_3,
                    alignment: AlignmentType.RIGHT,
                    bidirectional: true
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "الغاية الاستراتيجية / المؤشر المستهدف: ", bold: true, rightToLeft: true }),
                        new TextRun({ text: goal.objective || '---', rightToLeft: true }),
                    ],
                    alignment: AlignmentType.RIGHT,
                    bidirectional: true
                }),
                new Paragraph({ text: "" })
            );

            if (goal.tasks && goal.tasks.length > 0) {
                const taskRows = [
                    new TableRow({
                        children: [
                            createHeaderCell("الحالة"),
                            createHeaderCell("المسؤول"),
                            createHeaderCell("تاريخ البدء"),
                            createHeaderCell("خطوات التنفيذ"),
                            createHeaderCell("المهمة"),
                        ]
                    }),
                    ...goal.tasks.map((task: any) => {
                        let statusText = 'لم يبدأ';
                        if (task.status === 'completed') statusText = 'منجز';
                        else if (task.status === 'partial') statusText = 'جزئي';

                        return new TableRow({
                            children: [
                                createDataCell(statusText, true),
                                createDataCell(task.responsible),
                                createDataCell(task.startDate, true),
                                createDataCell(task.steps),
                                createDataCell(task.task),
                            ]
                        });
                    })
                ];

                children.push(
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        visuallyRightToLeft: true,
                        rows: taskRows,
                    }),
                    new Paragraph({ text: "" })
                );
            }
            children.push(new Paragraph({ text: "" }));
        });
    }

    // 7. Integration Plans
    if (integrationPlans.length > 0) {
        children.push(
            new Paragraph({
                children: [new TextRun({ text: "📑 خطط الدمج الفردية", bold: true, rightToLeft: true })],
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.RIGHT,
                bidirectional: true
            })
        );

        integrationPlans.forEach((plan: any, index: number) => {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: `خطة الطالب ${index + 1}: ${plan.studentName || ''} ${plan.studentFamilyName || ''}`, bold: true, rightToLeft: true })],
                    heading: HeadingLevel.HEADING_3,
                    alignment: AlignmentType.RIGHT,
                    bidirectional: true
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `رقم الهوية: ${plan.studentId || '---'} | الصف: ${plan.grade || '---'} | تاريخ الميلاد: ${plan.dateOfBirth || '---'} | السكن: ${plan.address || '---'}، ${plan.studentLocality || '---'}`, rightToLeft: true })
                    ],
                    alignment: AlignmentType.RIGHT,
                    bidirectional: true
                }),
                new Paragraph({ text: "" })
            );

            // Disabilities
            const disabilitiesList: string[] = [];
            if (plan.disabilities?.borderlineIntellect) disabilitiesList.push("ذكاء حدودي");
            if (plan.disabilities?.behavioralEmotional) disabilitiesList.push("اضطرابات سلوكية/عاطفية");
            if (plan.disabilities?.learningDisabilitiesADHD) disabilitiesList.push("صعوبات تعلم/ADHD");
            if (plan.disabilities?.developmentalDelayLanguage) disabilitiesList.push("تأخر لغوي");
            if (plan.disabilities?.developmentalDelayFunctional) disabilitiesList.push("تأخر وظيفي");

            if (disabilitiesList.length > 0) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: "وصف الأداء/التشخيص: ", bold: true, rightToLeft: true }),
                            new TextRun({ text: disabilitiesList.join("، "), rightToLeft: true }),
                        ],
                        alignment: AlignmentType.RIGHT,
                        bidirectional: true
                    })
                );
            }

            // Domain plans (brief summary in paragraph/table style)
            if (plan.domainPlans) {
                const domainRows = [
                    new TableRow({
                        children: [
                            createHeaderCell("التقييم"),
                            createHeaderCell("المدة"),
                            createHeaderCell("الطريقة"),
                            createHeaderCell("الأهداف العملية"),
                            createHeaderCell("المجال"),
                        ]
                    })
                ];

                const labels: Record<string, string> = {
                    academic: 'تعليمي',
                    social: 'اجتماعي',
                    emotional: 'عاطفي',
                    behavioral: 'سلوكي'
                };

                Object.entries(plan.domainPlans).forEach(([domainKey, dPlan]: any) => {
                    if (dPlan.goal || dPlan.objective || dPlan.method) {
                        domainRows.push(
                            new TableRow({
                                children: [
                                    createDataCell(dPlan.evaluation),
                                    createDataCell(dPlan.timeframe, true),
                                    createDataCell(dPlan.method),
                                    createDataCell(dPlan.objective),
                                    createDataCell(labels[domainKey] || domainKey, true),
                                ]
                            })
                        );
                    }
                });

                if (domainRows.length > 1) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "الخطة العلاجية حسب المجالات:", rightToLeft: true })],
                            alignment: AlignmentType.RIGHT,
                            bidirectional: true
                        }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            visuallyRightToLeft: true,
                            rows: domainRows,
                        }),
                        new Paragraph({ text: "" })
                    );
                }
            }
            children.push(new Paragraph({ text: "" }));
        });
    }

    const doc = new Document({
        sections: [{
            properties: {
                type: SectionType.CONTINUOUS,
            },
            children: children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Annual_Plan_${year}_${profile.name || 'Plan'}.docx`);
};

