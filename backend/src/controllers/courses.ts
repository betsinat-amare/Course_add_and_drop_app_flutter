import { Request, Response } from 'express';
import db from '../db';
import { Course } from '../models';

interface CreateCourseRequest extends Request {
    body: Omit<Course, 'id'>;
}

export const createCourse = (req: CreateCourseRequest, res: Response): void => {
    const { title, code, description, credit_hours }: Omit<Course, 'id'> = req.body;
    db.run(
        'INSERT INTO courses (title, code, description, credit_hours) VALUES (?, ?, ?, ?)',
        [title, code, description, credit_hours],
        function (err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.status(201).json({ id: this.lastID });
        }
    );
};

export const getCourses = (req: Request, res: Response): void => {
    db.all('SELECT * FROM courses', [], (err, rows: Course[]) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
};

export const getCourseById = (req: Request, res: Response): void => {
    const { id } = req.params;
    db.get('SELECT * FROM courses WHERE id = ?', [id], (err, row: Course) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }
        res.json(row);
    });
};

export const updateCourse = (req: Request, res: Response): void => {
    const { id } = req.params;
    const { title, code, description, credit_hours }: Omit<Course, 'id'> = req.body;
    db.run(
        'UPDATE courses SET title = ?, code = ?, description = ?, credit_hours = ? WHERE id = ?',
        [title, code, description, credit_hours, id],
        function (err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Course not found' });
                return;
            }
            res.json({ message: 'Course updated' });
        }
    );
};

export const deleteCourse = (req: Request, res: Response): void => {
    const { id } = req.params;
    db.run('DELETE FROM courses WHERE id = ?', [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }
        res.json({ message: 'Course deleted' });
    });
};