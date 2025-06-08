import { Router, Response } from 'express';
import sqlite3 from 'sqlite3';
import { authenticate } from '../middleware/auth';
import { check, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.use(authenticate);

router.post('/', [
    check('add_id').isInt().withMessage('Add ID must be an integer')
], async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { add_id } = req.body;
    const student_id = req.user!.id;

    const db = new sqlite3.Database('./college.db');

    // Check if the add exists, is approved, and belongs to the student
    db.get(
        'SELECT * FROM adds WHERE id = ? AND student_id = ? AND approval_status = ?',
        [add_id, student_id, 'approved'],
        (err, add: any) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!add) {
                db.close();
                return res.status(404).json({ error: 'Approved add not found' });
            }

            // Check if a drop already exists for this add
            db.get(
                'SELECT * FROM drops WHERE add_id = ?',
                [add_id],
                (err, drop: any) => {
                    if (err) {
                        db.close();
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    if (drop) {
                        db.close();
                        return res.status(400).json({ error: 'Drop already requested for this add' });
                    }

                    // Insert the drop request
                    db.run(
                        'INSERT INTO drops (add_id, student_id, course_id, approval_status) VALUES (?, ?, ?, ?)',
                        [add_id, student_id, add.course_id, 'pending'],
                        function(err) {
                            if (err) {
                                db.close();
                                return res.status(500).json({ error: 'Internal server error' });
                            }
                            db.close();
                            res.status(201).json({
                                id: this.lastID,
                                add_id,
                                student_id,
                                course_id: add.course_id,
                                approval_status: 'pending'
                            });
                        }
                    );
                }
            );
        }
    );
});

router.put('/:id', [
    check('approval_status').isIn(['approved', 'rejected']).withMessage('Invalid approval status')
], async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { approval_status } = req.body;

    if (req.user!.role !== 'Registrar') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const db = new sqlite3.Database('./college.db');

    db.get('SELECT * FROM drops WHERE id = ?', [id], (err, drop: any) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!drop) {
            db.close();
            return res.status(404).json({ error: 'Drop not found' });
        }

        db.run(
            'UPDATE drops SET approval_status = ? WHERE id = ?',
            [approval_status, id],
            (err) => {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: 'Internal server error' });
                }
                db.close();
                res.status(200).json({ message: 'Drop updated' });
            }
        );
    });
});

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const db = new sqlite3.Database('./college.db');

    if (req.user!.role === 'Student') {
        db.all(
            'SELECT * FROM drops WHERE student_id = ?',
            [req.user!.id],
            (err, drops) => {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: 'Internal server error' });
                }
                db.close();
                res.status(200).json(drops);
            }
        );
    } else {
        db.all('SELECT * FROM drops', (err, drops) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            db.close();
            res.status(200).json(drops);
        });
    }
});

export default router;