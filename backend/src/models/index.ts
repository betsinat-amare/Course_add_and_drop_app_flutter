// src/models/index.ts
export interface User {
    id: number;
    username: string;
    password: string;
    role: 'Registrar' | 'Student';
    email: string;
}

export interface Course {
    id: number;
    title: string;
    code: string;
    description: string;
    credit_hours: number;
}

export interface Add {
    id: number;
    student_id: number;
    course_id: number;
    approval_status: 'pending' | 'approved' | 'rejected';
    added_at: string;
}

export interface Drop {
    id: number;
    student_id: number;
    course_id: number;
    add_id: number;
    approval_status: 'pending' | 'approved' | 'rejected';
    dropped_at: string;
}