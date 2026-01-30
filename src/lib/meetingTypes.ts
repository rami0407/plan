export interface MeetingProtocol {
    id: string;
    date: string;
    type: 'principal' | 'staff' | 'counselor';
    participants: string[];
    topic: string;
    summary: string;
    decisions: string;
    nextSteps: string;
    createdAt: string;
}
