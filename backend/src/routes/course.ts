import { Router, Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import { authenticate, restrictTo } from '../middleware/auth';
import { check, validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../types';
import { error } from 'console';

const router = Router();

router.use(authenticate);

router.post('/', restrictTo('Registrar'), [
    check('title').notEmpty().withMessage('Title is required'),
    check('code').notEmpty().withMessage('Code is required'),
    check('credit_hours').isInt({ min: 1 }).withMessage('Credit hours must be a positive integer')
], async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { title, code, description, credit_hours } = req.body;
    const db = new sqlite3.Database('./college.db');

    db.get('SELECT * FROM courses WHERE code = ?', [code], (err, course: any) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (course) {
            db.close();
            return res.status(400).json({ error: 'Course code already exists' });
        }

        db.run(
            'INSERT INTO courses (title, code, description, credit_hours) VALUES (?, ?, ?, ?)',
            [title, code, description, credit_hours],
            function(err) {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: 'Internal server error' });
                }
                db.close();
                res.status(201).json({ id: this.lastID, title, code, description, credit_hours });
            }
        );
    });
});

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const db = new sqlite3.Database('./college.db');
    db.all('SELECT * FROM courses', (err, courses) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        db.close();
        res.status(200).json(courses);
    });
});
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const db =new sqlite3.Database('./college.db');
    db.get('SELECT * FROM courses WHERE id = ?', [id], (err, course) => {
        if(err){
            db.close();
        return res.status(500).json({error:'Internal server error'});
            }
        if(!course){
            db.close();
            return res.status(404).json({error:'Course not found'})     }
            db.close();
            res.status(200).json(course);
        });
});
router.delete('/:id', restrictTo('Registrar'), async (req: AuthenticatedRequest, res: Response) => {
    const {id}=req.params;
    const db = new sqlite3.Database('./college.db');
    db.run('DELETE FROM courses WHERE id = ?', [id], function(err) {
        if (err) {
            db.close();
            return res.status(500).json({error:'Internal server error'});
        }
        if (this.changes ===0) {
            db.close();
            return res.status(404).json({error:'Course not found'});
        }
        db.close();
        res.status(200).json({message:'Course deleted successfully'});
    });
});
router.put('/:id', restrictTo('Registrar'), async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const {title,code,description,credit_hours}=req.body;
    const db =new sqlite3.Database('./college.db');
    db.run(
        'UPDATE courses SET title = ?, code = ?, description = ?, credit_hours = ? WHERE id = ?',
        [title, code,description,credit_hours,id],
        function(err){
            if (err) {
                db.close()
                return res.status(500).json({error:'Internal server error'});

            }
            if (this.changes ===0){
                db.close();
                return res.status(404).json({error:'Course not found'});
            }
            db.close();
            res.status(200).json({message:'Course updated successfully'});
                    
        });

    
    });
export default router;