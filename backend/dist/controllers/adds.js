"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdd = exports.updateAdd = exports.getAdds = exports.createAdd = void 0;
const db_1 = __importDefault(require("../db"));
const createAdd = (req, res) => {
    const { course_id } = req.body;
    const student_id = req.user?.id;
    if (!student_id || req.user?.role !== 'Student') {
        res.status(403).json({ error: 'Only students can add courses' });
        return;
    }
    db_1.default.get('SELECT * FROM courses WHERE id = ?', [course_id], (err, course) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!course) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }
        db_1.default.all(`SELECT c.credit_hours
             FROM adds a
             JOIN courses c ON a.course_id = c.id
             WHERE a.student_id = ? AND a.approval_status = 'approved'`, [student_id], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            const currentCreditHours = rows.reduce((sum, row) => sum + row.credit_hours, 0);
            const newTotalCreditHours = currentCreditHours + course.credit_hours;
            if (newTotalCreditHours >= 35) {
                res.status(400).json({ error: 'Cannot add course: Total credit hours would exceed 35' });
                return;
            }
            db_1.default.run('INSERT INTO adds (student_id, course_id, approval_status) VALUES (?, ?, ?)', [student_id, course_id, 'pending'], function (err) {
                if (err) {
                    res.status(400).json({ error: err.message });
                    return;
                }
                res.status(201).json({ id: this.lastID });
            });
        });
    });
};
exports.createAdd = createAdd;
const getAdds = (req, res) => {
    const student_id = req.user?.id;
    const role = req.user?.role;
    if (!student_id) {
        res.status(403).json({ error: 'Authentication required' });
        return;
    }
    const query = role === 'Registrar'
        ? `SELECT a.*, c.title, c.code, c.credit_hours
           FROM adds a
           JOIN courses c ON a.course_id = c.id`
        : `SELECT a.*, c.title, c.code, c.credit_hours
           FROM adds a
           JOIN courses c ON a.course_id = c.id
           WHERE a.student_id = ?`;
    db_1.default.all(query, role === 'Registrar' ? [] : [student_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
};
exports.getAdds = getAdds;
const updateAdd = (req, res) => {
    const { id } = req.params;
    const { course_id, approval_status } = req.body;
    const user = req.user;
    if (!user || user.role !== 'Registrar') {
        res.status(403).json({ error: 'Only registrars can update adds' });
        return;
    }
    if (!course_id && !approval_status) {
        res.status(400).json({ error: 'At least one field (course_id or approval_status) must be provided' });
        return;
    }
    const fields = [];
    const values = [];
    if (course_id) {
        fields.push('course_id = ?');
        values.push(course_id);
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
    db_1.default.get('SELECT * FROM adds WHERE id = ?', [id], (err, add) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!add) {
            res.status(404).json({ error: 'Add not found' });
            return;
        }
        const courseIdToCheck = course_id || add.course_id;
        db_1.default.get('SELECT * FROM courses WHERE id = ?', [courseIdToCheck], (err, course) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (!course) {
                res.status(404).json({ error: 'Course not found' });
                return;
            }
            db_1.default.all(`SELECT c.credit_hours
                 FROM adds a
                 JOIN courses c ON a.course_id = c.id
                 WHERE a.student_id = ? AND a.approval_status = 'approved' AND a.id != ?`, [add.student_id, id], (err, rows) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                const currentCreditHours = rows.reduce((sum, row) => sum + row.credit_hours, 0);
                const newTotalCreditHours = currentCreditHours + course.credit_hours;
                if (approval_status === 'approved' && newTotalCreditHours >= 35) {
                    res.status(400).json({ error: 'Cannot approve add: Total credit hours would exceed 35' });
                    return;
                }
                db_1.default.run(`UPDATE adds SET ${fields.join(', ')} WHERE id = ?`, [...values, id], function (err) {
                    if (err) {
                        res.status(400).json({ error: err.message });
                        return;
                    }
                    if (this.changes === 0) {
                        res.status(404).json({ error: 'Add not found' });
                        return;
                    }
                    res.json({ message: 'Add updated' });
                });
            });
        });
    });
};
exports.updateAdd = updateAdd;
const deleteAdd = (req, res) => {
    const { id } = req.params;
    const user = req.user;
    if (!user || user.role !== 'Registrar') {
        res.status(403).json({ error: 'Only registrars can delete adds' });
        return;
    }
    db_1.default.run('DELETE FROM adds WHERE id = ?', [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Add not found' });
            return;
        }
        res.json({ message: 'Add deleted' });
    });
};
exports.deleteAdd = deleteAdd;
