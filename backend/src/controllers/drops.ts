import { Request, Response } from 'express';
import db from '../db';
import { Drop } from '../models';

interface CreateDropRequest extends Request {
    body: { add_id: number; course_id: number };
    user?: { id: number; role: string };
}

interface UpdateDropRequest extends Request {
    params: { id: string };
    body: { course_id?: number; add_id?: number; approval_status?: 'pending' | 'approved' | 'rejected' };
    user?: { id: number; role: string };
}

export const createDrop = (req: CreateDropRequest, res: Response): void => {
    const { add_id, course_id } = req.body;
    const student_id = req.user?.id;

    if (!student_id || req.user?.role !== 'Student') {
        res.status(403).json({ error: 'Only students can drop courses' });
        return;
    }

    db.get(
        'SELECT * FROM adds WHERE id = ? AND student_id = ? AND course_id = ? AND approval_status = ?',
        [add_id, student_id, course_id, 'approved'],
        (err, add) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (!add) {
                res.status(404).json({ error: 'Approved add not found or does not belong to student' });
                return;
            }

            db.run(
                'INSERT INTO drops (student_id, course_id, add_id, approval_status) VALUES (?, ?, ?, ?)',
                [student_id, course_id, add_id, 'pending'],
                function (err) {
                    if (err) {
                        res.status(400).json({ error: err.message });
                        return;
                    }
                    res.status(201).json({ id: this.lastID });
                }
            );
        }
    );
};

export const getDrops = (req: Request, res: Response): void => {
    const student_id = (req as any).user?.id;
    const role = (req as any).user?.role;

    if (!student_id) {
        res.status(403).json({ error: 'Authentication required' });
        return;
    }

    const query = role === 'Registrar'
        ? `SELECT d.*, c.title, c.code, c.credit_hours
           FROM drops d
           JOIN courses c ON d.course_id = c.id`
        : `SELECT d.*, c.title, c.code, c.credit_hours
           FROM drops d
           JOIN courses c ON d.course_id = c.id
           WHERE d.student_id = ?`;

    db.all(query, role === 'Registrar' ? [] : [student_id], (err, rows: Drop[]) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
};

export const updateDrop = (req: UpdateDropRequest, res: Response): void => {
    const { id } = req.params;
    const { course_id, add_id, approval_status } = req.body;
    const user = req.user;

    if (!user || user.role !== 'Registrar') {
        res.status(403).json({ error: 'Only registrars can update drops' });
        return;
    }

    if (!course_id && !add_id && !approval_status) {
        res.status(400).json({ error: 'At least one field (course_id, add_id, or approval_status) must be provided' });
        return;
    }

    const fields: string[] = [];
    const values: (number | string)[] = [];

    if (course_id) {
        fields.push('course_id = ?');
        values.push(course_id);
    }
    if (add_id) {
        fields.push('add_id = ?');
        values.push(add_id);
    }
    if (approval_status) {
        if (!['pending', 'approved', 'rejected'].includes(approval_status)) {
            res.status(400).json({ error: 'Invalid approval_status' });
            return;
        }
        fields.push('approval_status = ?');
        values.push(approval_status);
    }

    if (fields.length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
    }

    db.get('SELECT * FROM drops WHERE id = ?', [id], (err, drop: Drop) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!drop) {
            res.status(404).json({ error: 'Drop not found' });
            return;
        }

        const courseIdToCheck = course_id || drop.course_id;
        const addIdToCheck = add_id || drop.add_id;

        db.get('SELECT * FROM courses WHERE id = ?', [courseIdToCheck], (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            db.get('SELECT * FROM adds WHERE id = ? AND course_id = ?', [addIdToCheck, courseIdToCheck], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                db.run(
                    `UPDATE drops SET ${fields.join(', ')} WHERE id = ?`,
                    [...values, id],
                    function (err) {
                        if (err) {
                            res.status(400).json({ error: err.message });
                            return;
                        }
                        if (this.changes === 0) {
                            res.status(404).json({ error: 'Drop not found' });
                            return;
                        }
                        res.json({ message: 'Drop updated' });
                    }
                );
            });
        });
    });
};