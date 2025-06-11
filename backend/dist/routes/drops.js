"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sqlite3_1 = __importDefault(require("sqlite3"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', (0, auth_1.restrictTo)('Student'), async (req, res) => {
    const { add_id, course_id } = req.body;
    const student_id = req.user.id;
    if (!add_id || !course_id) {
        return res.status(400).json({ error: 'Add ID and course ID are required' });
    }
    const db = new sqlite3_1.default.Database('./college.db');
    db.get('SELECT * FROM adds WHERE id = ? AND student_id = ? AND course_id = ? AND approval_status = ?', [add_id, student_id, course_id, 'approved'], (err, add) => {
        if (err || !add) {
            db.close();
            return res.status(404).json({ error: 'Approved add not found' });
        }
        db.run('INSERT INTO drops (student_id, course_id, add_id, approval_status) VALUES (?, ?, ?, ?)', [student_id, course_id, add_id, 'pending'], function (err) {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            db.close();
            res.status(201).json({ id: this.lastID, student_id, course_id, add_id, approval_status: 'pending' });
        });
    });
});
router.put('/:id', (0, auth_1.restrictTo)('Registrar'), async (req, res) => {
    const { id } = req.params;
    const { approval_status } = req.body;
    if (!['approved', 'rejected'].includes(approval_status)) {
        return res.status(400).json({ error: 'Invalid approval status' });
    }
    const db = new sqlite3_1.default.Database('./college.db');
    db.run('UPDATE drops SET approval_status = ? WHERE id = ?', [approval_status, id], (err) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        db.close();
        res.status(200).json({ message: 'Drop updated' });
    });
});
router.get('/', async (req, res) => {
    const db = new sqlite3_1.default.Database('./college.db');
    if (req.user.role === 'Student') {
        db.all('SELECT * FROM drops WHERE student_id = ?', [req.user.id], (err, drops) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Internal server error' });
            }
            db.close();
            res.status(200).json(drops);
        });
    }
    else {
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
exports.default = router;
