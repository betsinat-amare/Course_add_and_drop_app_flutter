"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCourse = exports.updateCourse = exports.getCourseById = exports.getCourses = exports.createCourse = void 0;
const db_1 = __importDefault(require("../db"));
const createCourse = (req, res) => {
    const { title, code, description, credit_hours } = req.body;
    db_1.default.run('INSERT INTO courses (title, code, description, credit_hours) VALUES (?, ?, ?, ?)', [title, code, description, credit_hours], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(201).json({ id: this.lastID });
    });
};
exports.createCourse = createCourse;
const getCourses = (req, res) => {
    db_1.default.all('SELECT * FROM courses', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
};
exports.getCourses = getCourses;
const getCourseById = (req, res) => {
    const { id } = req.params;
    db_1.default.get('SELECT * FROM courses WHERE id = ?', [id], (err, row) => {
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
exports.getCourseById = getCourseById;
const updateCourse = (req, res) => {
    const { id } = req.params;
    const { title, code, description, credit_hours } = req.body;
    db_1.default.run('UPDATE courses SET title = ?, code = ?, description = ?, credit_hours = ? WHERE id = ?', [title, code, description, credit_hours, id], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Course not found' });
            return;
        }
        res.json({ message: 'Course updated' });
    });
};
exports.updateCourse = updateCourse;
const deleteCourse = (req, res) => {
    const { id } = req.params;
    db_1.default.run('DELETE FROM courses WHERE id = ?', [id], function (err) {
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
exports.deleteCourse = deleteCourse;
