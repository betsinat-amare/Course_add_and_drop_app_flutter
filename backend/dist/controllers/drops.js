"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDrop = exports.getDrops = exports.createDrop = void 0;
const db_1 = __importDefault(require("../db"));
const createDrop = (req, res) => {
    const { add_id, course_id } = req.body;
    const student_id = req.user?.id;
    if (!student_id || req.user?.role !== 'Student') {
        res.status(403).json({ error: 'Only students can drop courses' });
        return;
    }
    db_1.default.get('SELECT * FROM adds WHERE id = ? AND student_id = ? AND course_id = ? AND approval_status = ?', [add_id, student_id, course_id, 'approved'], (err, add) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!add) {
            res.status(404).json({ error: 'Approved add not found or does not belong to student' });
            return;
        }
        db_1.default.run('INSERT INTO drops (student_id, course_id, add_id, approval_status) VALUES (?, ?, ?, ?)', [student_id, course_id, add_id, 'pending'], function (err) {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.status(201).json({ id: this.lastID });
        });
    });
};
exports.createDrop = createDrop;
const getDrops = (req, res) => {
    const student_id = req.user?.id;
    const role = req.user?.role;
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
    db_1.default.all(query, role === 'Registrar' ? [] : [student_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
};
exports.getDrops = getDrops;
const updateDrop = (req, res) => {
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
    const fields = [];
    const values = [];
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
    db_1.default.get('SELECT * FROM drops WHERE id = ?', [id], (err, drop) => {
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
        db_1.default.get('SELECT * FROM courses WHERE id = ?', [courseIdToCheck], (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            db_1.default.get('SELECT * FROM adds WHERE id = ? AND course_id = ?', [addIdToCheck, courseIdToCheck], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                db_1.default.run(`UPDATE drops SET ${fields.join(', ')} WHERE id = ?`, [...values, id], function (err) {
                    if (err) {
                        res.status(400).json({ error: err.message });
                        return;
                    }
                    if (this.changes === 0) {
                        res.status(404).json({ error: 'Drop not found' });
                        return;
                    }
                    res.json({ message: 'Drop updated' });
                });
            });
        });
    });
};
exports.updateDrop = updateDrop;
