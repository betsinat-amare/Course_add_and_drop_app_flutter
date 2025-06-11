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
router.get('/', async (req, res) => {
    const db = new sqlite3_1.default.Database('./college.db');
    db.all('SELECT * FROM courses', (err, courses) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Internal server error' });
        }
        db.close();
        res.status(200).json(courses);
    });
});
exports.default = router;
