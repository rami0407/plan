import { WorkPlan } from '@/lib/types';

export interface CoordinatorProfile {
    id: string;
    name: string;
    subject: string;
    teachers: string[];
    phone?: string;
    email?: string;
}

export interface AnnualPlanningSection {
    yearlyGoals: string;
    monthlyPlans: {
        month: number;
        content: string;
    }[];
    weeklyPlans: {
        week: number;
        content: string;
    }[];
}

export interface GoalTask {
    id: string;
    task: string;
    steps: string;
    startDate: string;
    responsible: string;
    status: 'completed' | 'partial' | 'not-started';
}

export interface Goal {
    id: string;
    title: string;
    objective: string;
    tasks: GoalTask[];
}

export interface AnnualWorkPlan {
    id: string;
    year: number;
    coordinatorId: string;
    profile: CoordinatorProfile;
    planning: AnnualPlanningSection;
    goals: Goal[];
    createdAt: string;
    updatedAt: string;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
}
