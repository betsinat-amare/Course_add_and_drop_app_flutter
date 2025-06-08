import { Router } from 'express';
import sqlite3 from 'sqlite3';
import { authenticate, restrictTo } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.use(authenticate);

router.post('/', restrictTo('Student'), async (req: AuthenticatedRequest, res) => {
    const { course_id } = req.body;
    const student_id = req.user!.id;

    if (!course_id) {
        return res.status(400).json({ error: 'Course ID is required' });
    }

    const db = new sqlite3.Database('./college.db');
    db.get('SELECT * FROM courses WHERE id = ?', [course_id], (err, course: any) => {
        if (err || !course) {
            db.close();
            return res.status(404).json({ error: 'Course not found' });
        }

        db.run(
            'INSERT INTO adds (student_id, course_id, approval_status) VALUES (?, ?, ?)',
            [student_id, course_id, 'pending'],
            function(err) {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: 'Internal server error' });
                }
                db.close();
                res.status(201).json({ id: this.lastID, student_id, course_id, approval_status: 'pending' });
            }
        );
    });
});

router.put('/:id', restrictTo('Registrar'), async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { approval_status } = req.body;

    if (!['approved', 'rejected'].includes(approval_status)) {
        return res.status(400).json({ error: 'Invalid approval status' });
    }

    const db = new sqlite3.Database('./college.db');
    db.get('SELECT * FROM adds WHERE id = ?', [id], (err, add: any) => {
        if (err || !add) {
            db.close();
            return res.status(404).json({ error: 'Add not found' });
        }

        if (approval_status === 'approved') {
            db.get(
                'SELECT SUM(c.credit_hours) as total_credits FROM adds a JOIN courses c ON a.course_id = c.id WHERE a.student_id = ? AND a.approval_status = ?',
                [add.student_id, 'approved'],
                (err, result: any) => {
                    if (err) {
                        db.close();
                        return res.status(500).json({ error: 'Internal server error' });
                    }

                    const currentCredits = result.total_credits || 0;
                    console.log(`Approving add ${id}: Current credits = ${currentCredits}, Course ID = ${add.course_id}`); // Debug
                    db.get('SELECT credit_hours FROM courses WHERE id = ?', [add.course_id], (err, course: any) => {
                        if (err || !course) {
                            db.close();
                            return res.status(500).json({ error: 'Internal server error' });
                        }

                        const newCredits = currentCredits + course.credit_hours;
                        console.log(`Total credits after approval = ${newCredits}`); // Debug
                        if (newCredits > 35) {
                            db.close();
                            return res.status(400).json({ error: 'Cannot approve add: Total credit hours would exceed 35' });
                        }

                        db.run(
                            'UPDATE adds SET approval_status = ? WHERE id = ?',
                            [approval_status, id],
                            (err) => {
                                if (err) {
                                    db.close();
                                    return res.status(500).json({ error: 'Internal server error' });
                                }
                                db.close();
                                res.status(200).json({ message: 'Add updated' });
                            }
                        );
                    });
                }
            );
        } else {
            db.run(
                'UPDATE adds SET approval_status = ? WHERE id = ?',
                [approval_status, id],
                (err) => {
                    if (err) {
                        db.close();
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    db.close();
                    res.status(200).json({ message: 'Add updated' });
                }
            );
        }
    });
});

router.delete('/:id', restrictTo('Registrar'), async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;

    const db = new sqlite3.Database('./college.db');
    db.get('SELECT * FROM adds WHERE id = ? AND approval_status = ?', [id, 'pending'], (err, add: any) => {
        if (err || !add) {
            db.close();
            return res.status(404).json({ error: 'Pending add not found' });
        }

        db.run('DELETE FROM adds WHERE id = ?', [id], (err) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            db.close();
            res.status(200).json({ message: 'Add deleted' });
        });
    });
});

router.get('/', async (req: AuthenticatedRequest, res) => {
    const db = new sqlite3.Database('./college.db');
    if (req.user!.role === 'Student') {
        db.all('SELECT * FROM adds WHERE student_id = ?', [req.user!.id], (err, adds) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            db.close();
            res.status(200).json(adds);
        });
    } else {
        db.all('SELECT * FROM adds', (err, adds) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            db.close();
            res.status(200).json(adds);
        });
    }
});

export default router;