import { Router, Response } from 'express';
import sqlite3 from 'sqlite3';
import { authenticate, restrictTo } from '../src/middleware/auth';
import { check, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../src/types';

const router = Router();

router.use(authenticate);

router.post('/', [
    check('course_id').isInt().withMessage('Course ID must be an integer')
], async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { course_id } = req.body;
    const student_id = req.user!.id;

    const db = new sqlite3.Database('./college.db');

    db.get('SELECT * FROM courses WHERE id = ?', [course_id], (err, course: any) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!course) {
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

router.put('/:id', restrictTo('Registrar'), [
    check('approval_status').isIn(['approved', 'rejected']).withMessage('Invalid approval status')
], async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { approval_status } = req.body;

    const db = new sqlite3.Database('./college.db');

    db.get('SELECT * FROM adds WHERE id = ?', [id], (err, add: any) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!add) {
            db.close();
            return res.status(404).json({ error: 'Add not found' });
        }

        if (approval_status === 'approved') {
            db.all(
                'SELECT c.credit_hours FROM adds a JOIN courses c ON a.course_id = c.id WHERE a.student_id = ? AND a.approval_status = ?',
                [add.student_id, 'approved'],
                (err, rows: any[]) => {
                    if (err) {
                        db.close();
                        return res.status(500).json({ error: 'Internal server error' });
                    }

                    const currentCredits = rows.reduce((sum, row) => sum + row.credit_hours, 0);
                    db.get('SELECT credit_hours FROM courses WHERE id = ?', [add.course_id], (err, course: any) => {
                        if (err) {
                            db.close();
                            return res.status(500).json({ error: 'Internal server error' });
                        }

                        const totalCredits = currentCredits + course.credit_hours;
                        console.log(`Approving add ${id}: Current credits = ${currentCredits}, Course ID = ${add.course_id}`);
                        console.log(`Total credits after approval = ${totalCredits}`);

                        if (totalCredits > 35) {
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

router.delete('/:id', restrictTo('Registrar'), async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const db = new sqlite3.Database('./college.db');

    db.get('SELECT * FROM adds WHERE id = ?', [id], (err, add: any) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!add) {
            db.close();
            return res.status(404).json({ error: 'Add not found' });
        }
        if (add.approval_status !== 'pending') {
            db.close();
            return res.status(400).json({ error: 'Can only delete pending adds' });
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

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const db = new sqlite3.Database('./college.db');

    if (req.user!.role === 'Student') {
        db.all(
            'SELECT a.*, c.title, c.code, c.credit_hours FROM adds a JOIN courses c ON a.course_id = c.id WHERE a.student_id = ?',
            [req.user!.id],
            (err, adds) => {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: 'Internal server error' });
                }
                db.close();
                res.status(200).json(adds);
            }
        );
    } else {
        db.all(
            'SELECT a.*, c.title, c.code, c.credit_hours, u.username FROM adds a JOIN courses c ON a.course_id = c.id JOIN users u ON a.student_id = u.id',
            (err, adds) => {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: 'Internal server error' });
                }
                db.close();
                res.status(200).json(adds);
            }
        );
    }
});

export default router;