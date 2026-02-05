export type Role = 'ADMIN' | 'PRINCIPAL' | 'COORDINATOR' | 'TEACHER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  phone?: string;
  trainingHistory?: string[]; // For "פרופיל מורים"
}

export interface Teacher extends User {
  subjects: string[];
  homeroomClassId?: string; // If they are a homeroom teacher (مربي)
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  // Holistic Map Data
  academicStatus?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  // 1. Attendance
  attendance?: 'Regular' | 'Rarely' | 'Often' | 'Dropout';
  // 2. Violence
  violence?: 'Often' | 'Rarely' | 'VerbalOften' | 'VerbalRarely' | 'None';
  // 3. Social Status
  socialStatus?: 'Leader' | 'Involved' | 'Lonely' | 'Rejected' | string;
  // 4. Need Diagnosis
  needsDiagnosis?: boolean;
  // 5. Learning Resource
  learningResource?: 'Individual' | 'Inclusion' | 'Reinforcement' | 'Other';
  // 6. Emotional Resource
  emotionalResource?: 'Psychologist' | 'Counselor' | 'Art' | 'Other';
  // 7. Strengths
  strengths?: string;
  // 8. Weaknesses (Points to Strengthen)
  weaknesses?: string;
  // 9. Enrichment Programs
  enrichmentPrograms?: 'School' | 'Outside' | 'Both' | 'None';
  // 10. Layer Enrichment Type
  layerEnrichmentType?: string;
  // 11. Family Status
  familyStatus?: 'Married' | 'Divorced' | 'Other';
  // 12. Scholarship
  scholarship?: boolean;
  // 13. Health Condition
  healthCondition?: string;
  // 14. Disabilities
  disabilities?: string;
  // 15. Resource Type
  resourceType?: string;
  
  emotionalStatus?: string;
  economicStatus?: string;
  absences: number;
  notes?: string;
  grades: Record<string, number | string>; // Subject -> Score
}

export interface ClassGroup {
  id: string;
  name: string; // e.g. "أول أ", "Vav 3"
  grade: number; // 1-6
  homeroomTeacherId: string;
  subjects?: string[]; // Custom subjects/columns for the class
}

export interface TeachingStaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastTraining: string;
  classes: string;
}

export interface IntegrationPlan {
  id: string;
  // School Details
  schoolName: string;
  schoolSymbol: string;
  locality: string;

  // Student Details
  studentName: string; // Private Name
  studentFamilyName: string;
  studentId: string;
  dateOfBirth: string;
  address: string;
  studentLocality: string;
  phone: string;
  grade: string;
  responsiblePerson: string; // In school
  responsiblePersonRole: string;
  welfareStatus: string; // Known to welfare?
  regularAttendance: boolean;

  // Characterization (Checkboxes)
  disabilities: {
    borderlineIntellect: boolean;
    behavioralEmotional: boolean;
    learningDisabilitiesADHD: boolean;
    developmentalDelayFunctional: boolean;
    developmentalDelayLanguage: boolean;
    diagnosisProcess: boolean;
  };

  // Expanded Fields
  domains: {
    cognitive: { strengths: string; focus: string };
    academic: { strengths: string; focus: string };
    social: { strengths: string; focus: string };
    emotional: { strengths: string; focus: string };
    motor: { strengths: string; focus: string };
  };

  generalInfo: {
    personalProgram: boolean;
    behavioralProgram: boolean;
    schoolSupport: boolean;
  };

  supports: {
    inclusionHours: boolean;
    individualHours: boolean;
    teachingSupport: boolean;
    paramedical: boolean;
    conversations: boolean;
    psychologist: boolean;
    other: string; // Text content if any
  };

  // Final Additions
  communitySupports: string; // Text area content
  assessments: {
    didactic: boolean;
    psychologic: boolean;
    psychodidactic: boolean;
    other: string;
  };

  domainPlans: {
    academic: { goal: string; objective: string; method: string; timeframe: string; evaluation: string; participants: string };
    social: { goal: string; objective: string; method: string; timeframe: string; evaluation: string; participants: string };
    emotional: { goal: string; objective: string; method: string; timeframe: string; evaluation: string; participants: string };
    behavioral: { goal: string; objective: string; method: string; timeframe: string; evaluation: string; participants: string };
  };
}

export interface WorkPlan {
  id: string;
  authorId: string;
  subject: string;
  month: number;
  year: number;
  weeklyPlans: {
    weekNumber: number;
    content: string; // "What will be taught"
  }[];
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  feedback?: string; // Principal's feedback
  teachingStaff?: TeachingStaffMember[];
  integrationPlans?: IntegrationPlan[];
}

export interface HolisticMapSubmission {
  id: string;
  classId: string;
  teacherId: string;
  date: string;
  studentData: Student[]; // Snapshot of data
}

export interface Notification {
  id: string;
  userId?: string; // Legacy Recipient ID
  recipientId?: string; // 'admin' or specific user ID
  title: string;
  message: string;
  read: boolean;
  createdAt: any; // Timestamp or number
  date?: any; // Alternate timestamp field
  link?: string;
  type: 'FEEDBACK' | 'SYSTEM' | 'REMINDER' | 'plan_submission' | 'intervention_update' | 'general_message';
  senderName?: string;
  senderRole?: string;
  status?: 'pending' | 'approved' | 'changes_requested'; // For approval notifications
  feedback?: string;
  pinned?: boolean;
  archived?: boolean;
}

export type EventType = 'holiday' | 'event' | 'exam' | 'meeting' | 'admin';

export interface SchoolEvent {
  id: string;
  title: string;
  start: string; // ISO Date String YYYY-MM-DD
  end?: string;
  type: EventType;
  color: string;
  description?: string;
  createdBy: string;
  createdAt: number;
}

export interface CalendarMetadata {
  id: string; // Format: YYYY-MM
  monthValue: string; // e.g. "Respect"
  notes: string;
}

export interface Task {
  id: string;
  text: string;
  assignedTo: string; // User ID
  isCompleted: boolean;
  createdAt: number;
  createdBy: string; // User ID
}

export interface SchoolProfileRow {
  id: string;
  className: string;
  teacherName: string;
  studentCount: number;
  teachingHours: number;
  individualHours: number;
  outstandingCount: number;
  strugglingCount: number;
  notes: string;
}

export interface BookListRow {
  id: string;
  layer: string;
  bookName: string;
  publisher: string;
  author: string;
  year: string;
}

export interface AnnualGoalTask {
  id: string;
  task: string;
  steps: string;
  startDate: string;
  responsible: string;
  status: 'not-started' | 'partial' | 'completed';
}

export interface AnnualGoal {
  id: string;
  title: string;
  objective: string;
  tasks: AnnualGoalTask[];
}

export interface AnnualPlanData {
  id: string; // Year
  profile: {
    name: string;
    subject: string;
    teachers: string[];
    phone: string;
    email: string;
  };
  teachingStaff: TeachingStaffMember[];
  schoolProfileTable: SchoolProfileRow[];
  bookList: BookListRow[];
  yearlyGoals: string;
  goals: AnnualGoal[]; // Detailed goals table
  updatedAt: number;
}

export interface CoordinatorPlan {
  id: string;
  coordinatorName: string;
  subject: string;
  year: number;
  status: string;
  lastUpdated?: string;
  updatedAt?: number;
  completionRate: number;
  goalsCount: number;
  tasksCount: number;
  userId: string;
}

export type Term = '1' | '2' | '3' | '4';

export interface StudentAssessment {
  id: string; // Format: ${studentId}_${year}_${term}
  studentId: string;
  classId: string;
  year: number;
  term: Term;
  academicStatus: 'Excellent' | 'Good' | 'Fair' | 'Poor' | '';
  socialStatus: string;
  emotionalStatus: string;
  economicStatus: string;
  absences: number;
  notes: string;
  grades: Record<string, number | string>;
  updatedAt: number;
}
