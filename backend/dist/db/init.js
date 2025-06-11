"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const initializeDatabase = async () => {
    const db = new sqlite3_1.default.Database('./college.db');
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('Student', 'Registrar')),
                email TEXT NOT NULL UNIQUE
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE,
                description TEXT,
                credit_hours INTEGER NOT NULL
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS adds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                approval_status TEXT NOT NULL CHECK(approval_status IN ('pending', 'approved', 'rejected')),
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES users(id),
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS drops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                add_id INTEGER NOT NULL,
                approval_status TEXT NOT NULL CHECK(approval_status IN ('pending', 'approved', 'rejected')),
                dropped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES users(id),
                FOREIGN KEY (course_id) REFERENCES courses(id),
                FOREIGN KEY (add_id) REFERENCES adds(id)
            )
        `);
        db.run('INSERT OR IGNORE INTO users (id, username, password, role, email) VALUES (?, ?, ?, ?, ?)', [1, 'teststudent', bcrypt_1.default.hashSync('password123', 10), 'Student', 'teststudent@example.com']);
        db.run('INSERT OR IGNORE INTO users (id, username, password, role, email) VALUES (?, ?, ?, ?, ?)', [2, 'testregistrar', bcrypt_1.default.hashSync('password123', 10), 'Registrar', 'testregistrar@example.com']);
        db.run('INSERT OR IGNORE INTO courses (id, title, code, description, credit_hours) VALUES (?, ?, ?, ?, ?)', [1, 'Course 1', 'C101', 'Description 1', 10]);
        db.run('INSERT OR IGNORE INTO courses (id, title, code, description, credit_hours) VALUES (?, ?, ?, ?, ?)', [2, 'Course 2', 'C102', 'Description 2', 20]);
        db.run('INSERT OR IGNORE INTO courses (id, title, code, description, credit_hours) VALUES (?, ?, ?, ?, ?)', [3, 'Course 3', 'C103', 'Description 3', 4]);
    });
    db.close();
};
exports.initializeDatabase = initializeDatabase;
(0, exports.initializeDatabase)().catch(err => console.error('Database initialization failed:', err));
